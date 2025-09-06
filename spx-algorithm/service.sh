#!/bin/bash

# SPX Algorithm 服务管理脚本
# 版本: 1.0
# 用法: ./service.sh {start|stop|restart|status|logs}

set -e

# ============================================
# 配置变量
# ============================================
SERVICE_NAME="SPX Algorithm Service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
PYTHON_CMD="python3"
VENV_PATH=""
PID_FILE="$APP_DIR/spx_service.pid"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/service.log"
ACCESS_LOG="$LOG_DIR/access.log"
ERROR_LOG="$LOG_DIR/error.log"

# 服务配置
HEALTH_CHECK_URL="http://localhost:5000/api/health"
MAX_STARTUP_TIME=300  # 5分钟启动超时（考虑模型加载时间）
HEALTH_CHECK_INTERVAL=5
SHUTDOWN_TIMEOUT=30
GUNICORN_WORKERS=4
FLASK_ENV="${FLASK_ENV:-production}"
PORT="${PORT:-5000}"
HOST="${HOST:-0.0.0.0}"

# ============================================
# 颜色输出配置
# ============================================
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' PURPLE='' CYAN='' NC=''
fi

# ============================================
# 日志函数
# ============================================
log() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1"
}

log_success() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] ✓${NC} $1"
}

log_warning() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] ⚠${NC} $1"
}

log_error() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ✗${NC} $1" >&2
}

log_info() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp] ℹ${NC} $1"
}

# ============================================
# 工具函数
# ============================================

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查端口是否被占用
is_port_in_use() {
    local port=$1
    if command_exists netstat; then
        netstat -tlnp 2>/dev/null | grep -q ":$port "
    elif command_exists ss; then
        ss -tlnp 2>/dev/null | grep -q ":$port "
    else
        # 使用 nc 测试端口
        timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null
    fi
}

# 等待端口可用
wait_for_port() {
    local port=$1
    local timeout=${2:-30}
    local count=0
    
    while [ $count -lt $timeout ]; do
        if is_port_in_use "$port"; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    return 1
}

# 创建必要的目录
create_directories() {
    log "创建必要的目录..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$APP_DIR/tmp"
    log_success "目录创建完成"
}

# ============================================
# 环境检查和准备
# ============================================

check_environment() {
    log "检查运行环境..."
    
    # 检查 Python
    if command_exists python3; then
        PYTHON_CMD="python3"
    elif command_exists python; then
        PYTHON_CMD="python"
    else
        log_error "未找到 Python 解释器"
        return 1
    fi
    
    local python_version=$($PYTHON_CMD --version 2>&1)
    log_info "Python 版本: $python_version"
    
    # 检查虚拟环境
    if [[ -d "$APP_DIR/venv" ]]; then
        VENV_PATH="$APP_DIR/venv"
    elif [[ -d "$APP_DIR/.venv" ]]; then
        VENV_PATH="$APP_DIR/.venv"
    elif [[ -n "$VIRTUAL_ENV" ]]; then
        VENV_PATH="$VIRTUAL_ENV"
        log_info "使用当前激活的虚拟环境: $VIRTUAL_ENV"
    fi
    
    if [[ -n "$VENV_PATH" ]]; then
        log_info "虚拟环境路径: $VENV_PATH"
    else
        log_warning "未找到虚拟环境，将使用系统 Python"
    fi
    
    # 检查必要文件
    if [[ ! -f "$APP_DIR/app.py" ]]; then
        log_error "未找到 app.py 文件"
        return 1
    fi
    
    if [[ ! -f "$APP_DIR/requirements.txt" ]]; then
        log_warning "未找到 requirements.txt 文件"
    fi
    
    log_success "环境检查完成"
    return 0
}

activate_virtual_environment() {
    if [[ -n "$VENV_PATH" && -f "$VENV_PATH/bin/activate" ]]; then
        log "激活虚拟环境..."
        source "$VENV_PATH/bin/activate" || {
            log_error "无法激活虚拟环境"
            return 1
        }
        log_success "虚拟环境已激活"
    fi
}

install_dependencies() {
    if [[ -f "$APP_DIR/requirements.txt" ]]; then
        log "检查并安装依赖..."
        $PYTHON_CMD -m pip install -q -r "$APP_DIR/requirements.txt" || {
            log_error "依赖安装失败"
            return 1
        }
        log_success "依赖检查完成"
    fi
}

# ============================================
# 服务状态管理
# ============================================

get_service_pid() {
    if [[ -f "$PID_FILE" ]]; then
        cat "$PID_FILE" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

is_service_running() {
    local pid=$(get_service_pid)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        # 清理过期的PID文件
        [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
        return 1
    fi
}

wait_for_service_ready() {
    log "等待服务启动完成..."
    local start_time=$(date +%s)
    local dots=""
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # 检查超时
        if [[ $elapsed -ge $MAX_STARTUP_TIME ]]; then
            log_error "服务启动超时 (${MAX_STARTUP_TIME}s)"
            return 1
        fi
        
        # 检查进程是否还在运行
        if ! is_service_running; then
            log_error "服务进程意外退出"
            return 1
        fi
        
        # 检查健康状态
        if command_exists curl; then
            local response=$(curl -s -f "$HEALTH_CHECK_URL" 2>/dev/null || echo "")
            if [[ -n "$response" ]]; then
                log_success "服务启动完成！(耗时 ${elapsed}s)"
                return 0
            fi
        fi
        
        # 显示进度
        if [[ $((elapsed % 15)) -eq 0 ]] && [[ $elapsed -gt 0 ]]; then
            log_info "服务启动中... (${elapsed}s/${MAX_STARTUP_TIME}s)"
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# ============================================
# 服务操作函数
# ============================================

start_service() {
    log "========================================="
    log "启动 $SERVICE_NAME"
    log "环境: $FLASK_ENV | 端口: $PORT"
    log "========================================="
    
    # 检查是否已运行
    if is_service_running; then
        local pid=$(get_service_pid)
        log_warning "服务已在运行 (PID: $pid)"
        return 0
    fi
    
    # 检查端口
    if is_port_in_use "$PORT"; then
        log_error "端口 $PORT 已被占用"
        return 1
    fi
    
    # 环境准备
    check_environment || return 1
    create_directories
    activate_virtual_environment || return 1
    install_dependencies || return 1
    
    # 切换到应用目录
    cd "$APP_DIR"
    
    # 设置环境变量
    export FLASK_ENV="$FLASK_ENV"
    export PORT="$PORT"
    export HOST="$HOST"
    
    # 启动服务
    log "启动服务进程..."
    if [[ "$FLASK_ENV" == "development" ]]; then
        log_info "使用开发模式启动"
        nohup $PYTHON_CMD app.py > "$LOG_FILE" 2>&1 &
    else
        log_info "使用生产模式启动 (Gunicorn)"
        nohup $PYTHON_CMD -m gunicorn \
            --bind "$HOST:$PORT" \
            --workers $GUNICORN_WORKERS \
            --worker-class sync \
            --timeout 120 \
            --keep-alive 5 \
            --max-requests 1000 \
            --max-requests-jitter 100 \
            --log-level info \
            --access-logfile "$ACCESS_LOG" \
            --error-logfile "$ERROR_LOG" \
            --daemon \
            --pid "$PID_FILE" \
            "app:create_app()" > "$LOG_FILE" 2>&1
        
        # 等待PID文件生成
        local count=0
        while [[ ! -f "$PID_FILE" && $count -lt 30 ]]; do
            sleep 1
            count=$((count + 1))
        done
    fi
    
    # 获取进程ID
    local pid
    if [[ "$FLASK_ENV" == "development" ]]; then
        pid=$!
        echo $pid > "$PID_FILE"
    else
        pid=$(get_service_pid)
    fi
    
    if [[ -n "$pid" ]]; then
        log_success "服务进程已启动 (PID: $pid)"
    else
        log_error "无法获取服务进程ID"
        return 1
    fi
    
    # 等待服务就绪
    if wait_for_service_ready; then
        log_success "========================================="
        log_success "$SERVICE_NAME 启动成功！"
        log_success "服务地址: http://$HOST:$PORT"
        log_success "健康检查: $HEALTH_CHECK_URL"
        log_success "========================================="
        return 0
    else
        log_error "服务启动失败"
        stop_service_force
        return 1
    fi
}

stop_service() {
    log "========================================="
    log "停止 $SERVICE_NAME"
    log "========================================="
    
    if ! is_service_running; then
        log_warning "服务未运行"
        return 0
    fi
    
    local pid=$(get_service_pid)
    log "发送停止信号到进程 $pid..."
    
    # 发送 TERM 信号
    kill -TERM "$pid" 2>/dev/null || {
        log_error "无法发送停止信号"
        return 1
    }
    
    # 等待优雅关闭
    log "等待服务优雅关闭..."
    local count=0
    while kill -0 "$pid" 2>/dev/null && [[ $count -lt $SHUTDOWN_TIMEOUT ]]; do
        sleep 1
        count=$((count + 1))
        if [[ $((count % 5)) -eq 0 ]]; then
            log_info "等待中... (${count}s/${SHUTDOWN_TIMEOUT}s)"
        fi
    done
    
    # 检查是否成功停止
    if kill -0 "$pid" 2>/dev/null; then
        log_warning "服务未在预期时间内关闭，强制终止..."
        kill -KILL "$pid" 2>/dev/null || true
        sleep 2
        
        if kill -0 "$pid" 2>/dev/null; then
            log_error "无法停止服务"
            return 1
        fi
    fi
    
    # 清理PID文件
    rm -f "$PID_FILE"
    
    log_success "========================================="
    log_success "$SERVICE_NAME 已停止"
    log_success "========================================="
    return 0
}

stop_service_force() {
    local pid=$(get_service_pid)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        log_warning "强制停止服务 (PID: $pid)"
        kill -KILL "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
    fi
}

restart_service() {
    log "========================================="
    log "重启 $SERVICE_NAME"
    log "========================================="
    
    stop_service
    sleep 2
    start_service
}

show_service_status() {
    log "========================================="
    log "$SERVICE_NAME 状态信息"
    log "========================================="
    
    # 进程状态
    if is_service_running; then
        local pid=$(get_service_pid)
        log_success "服务状态: 运行中"
        log_info "进程 ID: $pid"
        
        # 进程详细信息
        if command_exists ps; then
            local process_info=$(ps -p "$pid" -o pid,ppid,pcpu,pmem,etime,cmd --no-headers 2>/dev/null || echo "无法获取进程信息")
            log_info "进程信息: $process_info"
        fi
        
        # 端口状态
        if is_port_in_use "$PORT"; then
            log_success "端口状态: $PORT 已绑定"
        else
            log_warning "端口状态: $PORT 未绑定"
        fi
        
        # 健康检查
        if command_exists curl; then
            local response=$(curl -s -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
            local http_code="${response: -3}"
            local body="${response%???}"
            
            if [[ "$http_code" == "200" ]]; then
                log_success "健康检查: 通过 (HTTP $http_code)"
                [[ -n "$body" ]] && log_info "响应内容: $body"
            else
                log_error "健康检查: 失败 (HTTP $http_code)"
            fi
        fi
        
    else
        log_warning "服务状态: 已停止"
    fi
    
    # 配置信息
    echo ""
    log_info "配置信息:"
    log_info "  运行环境: $FLASK_ENV"
    log_info "  服务地址: http://$HOST:$PORT"
    log_info "  健康检查: $HEALTH_CHECK_URL"
    log_info "  日志文件: $LOG_FILE"
    log_info "  PID 文件: $PID_FILE"
    
    # 系统资源
    echo ""
    log_info "系统资源:"
    if command_exists free; then
        local mem_info=$(free -h | grep Mem | awk '{print $3"/"$2" ("int($3/$2*100)"%)"}')
        log_info "  内存使用: $mem_info"
    fi
    
    if command_exists df; then
        local disk_usage=$(df -h "$APP_DIR" | tail -1 | awk '{print $5}')
        log_info "  磁盘使用: $disk_usage"
    fi
    
    log "========================================="
}

show_service_logs() {
    local lines=${1:-50}
    local follow=${2:-false}
    
    if [[ ! -f "$LOG_FILE" ]]; then
        log_warning "日志文件不存在: $LOG_FILE"
        return 1
    fi
    
    log "========================================="
    log "服务日志 (最近 $lines 行)"
    log "========================================="
    
    if [[ "$follow" == "true" ]]; then
        tail -f -n "$lines" "$LOG_FILE"
    else
        tail -n "$lines" "$LOG_FILE"
    fi
}

# ============================================
# 主函数
# ============================================

show_usage() {
    cat << EOF
用法: $0 {start|stop|restart|status|logs}

命令:
    start    - 启动服务
    stop     - 停止服务  
    restart  - 重启服务
    status   - 显示服务状态
    logs     - 显示服务日志

环境变量:
    FLASK_ENV - 运行环境 (development/production，默认: production)
    PORT      - 端口号 (默认: 5000)
    HOST      - 绑定地址 (默认: 0.0.0.0)

示例:
    $0 start                    # 启动服务
    $0 status                   # 查看状态
    $0 logs                     # 查看日志
    FLASK_ENV=development $0 start  # 开发模式启动
    PORT=8080 $0 restart        # 指定端口重启

EOF
}

main() {
    local action="${1:-}"
    
    case "$action" in
        "start")
            start_service
            ;;
        "stop")
            stop_service
            ;;
        "restart")
            restart_service
            ;;
        "status")
            show_service_status
            ;;
        "logs")
            show_service_logs "${2:-50}" "${3:-false}"
            ;;
        "logs-follow"|"logs-f")
            show_service_logs "${2:-50}" "true"
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi