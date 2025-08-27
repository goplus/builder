#!/bin/bash

# 图像搜索API服务管理脚本

# 配置参数
SERVICE_NAME="image-search-api"
HOST=0.0.0.0
PORT=8090
PID_FILE="/tmp/gunicorn_${SERVICE_NAME}.pid"
LOG_DIR="$(pwd)/logs"
ACCESS_LOG="${LOG_DIR}/access.log"
ERROR_LOG="${LOG_DIR}/error.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查进程是否运行
check_process() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # 进程存在
        else
            rm -f "$PID_FILE"  # 清理无效的PID文件
            return 1  # 进程不存在
        fi
    else
        return 1  # PID文件不存在
    fi
}

# 启动服务
start_service() {
    log_info "启动 $SERVICE_NAME 生产环境服务器..."
    
    # 检查是否已经运行
    if check_process; then
        local pid=$(cat "$PID_FILE")
        log_warning "服务已在运行 (PID: $pid)"
        return 1
    fi
    
    # 设置环境变量
    export FLASK_ENV=production
    export HOST=$HOST
    export PORT=$PORT
    
    # 创建必要目录
    mkdir -p "$LOG_DIR"
    mkdir -p /tmp
    
    # 启动Gunicorn
    gunicorn \
        --bind $HOST:$PORT \
        --workers 4 \
        --worker-class sync \
        --timeout 120 \
        --keep-alive 2 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --preload \
        --access-logfile "$ACCESS_LOG" \
        --error-logfile "$ERROR_LOG" \
        --log-level info \
        --pid "$PID_FILE" \
        --daemon \
        run:app
    
    # 等待服务启动
    local max_wait=10
    local count=0
    
    while [ $count -lt $max_wait ]; do
        sleep 1
        # 检查PID文件是否存在且进程正在运行
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE" 2>/dev/null)
            if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
                log_success "服务启动成功 (PID: $pid)"
                log_success "服务地址: http://$HOST:$PORT"
                log_info "访问日志: $ACCESS_LOG"
                log_info "错误日志: $ERROR_LOG"
                return 0
            fi
        fi
        count=$((count + 1))
        log_info "等待服务启动... ($count/$max_wait)"
    done
    
    log_error "服务启动失败"
    log_error "请查看错误日志: $ERROR_LOG"
    return 1
}

# 停止服务
stop_service() {
    log_info "停止 $SERVICE_NAME 服务..."
    
    if check_process; then
        local pid=$(cat "$PID_FILE")
        
        # 优雅关闭
        kill -TERM "$pid"
        
        # 等待进程结束
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 30 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # 强制关闭
        if ps -p "$pid" > /dev/null 2>&1; then
            log_warning "优雅关闭超时，强制关闭进程"
            kill -KILL "$pid"
            sleep 1
        fi
        
        # 清理PID文件
        rm -f "$PID_FILE"
        
        if ! ps -p "$pid" > /dev/null 2>&1; then
            log_success "服务已停止"
        else
            log_error "服务停止失败"
            return 1
        fi
    else
        log_warning "服务未运行"
    fi
}

# 重启服务
restart_service() {
    log_info "重启 $SERVICE_NAME 服务..."
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
status_service() {
    log_info "检查 $SERVICE_NAME 服务状态..."
    
    if check_process; then
        local pid=$(cat "$PID_FILE")
        log_success "服务运行中 (PID: $pid)"
        log_info "服务地址: http://$HOST:$PORT"
        
        # 显示进程信息
        echo -e "\n${BLUE}进程信息:${NC}"
        ps -p "$pid" -o pid,ppid,pcpu,pmem,etime,command
        
        # 显示端口占用
        echo -e "\n${BLUE}端口占用:${NC}"
        lsof -i :$PORT 2>/dev/null | head -5
        
        # 显示最近日志
        if [ -f "$ERROR_LOG" ]; then
            echo -e "\n${BLUE}最近错误日志:${NC}"
            tail -5 "$ERROR_LOG" 2>/dev/null || echo "暂无错误日志"
        fi
        
    else
        log_warning "服务未运行"
        return 1
    fi
}

# 查看日志
show_logs() {
    local log_type="${1:-error}"
    case "$log_type" in
        "access")
            log_info "显示访问日志 (Ctrl+C 退出):"
            tail -f "$ACCESS_LOG"
            ;;
        "error")
            log_info "显示错误日志 (Ctrl+C 退出):"
            tail -f "$ERROR_LOG"
            ;;
        *)
            log_error "无效的日志类型: $log_type"
            log_info "用法: $0 logs [access|error]"
            return 1
            ;;
    esac
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    if ! check_process; then
        log_error "服务未运行"
        return 1
    fi
    
    # HTTP健康检查
    local health_url="http://$HOST:$PORT/api/health"
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_check.json "$health_url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        log_success "健康检查通过"
        log_info "响应内容:"
        cat /tmp/health_check.json | python3 -m json.tool 2>/dev/null || cat /tmp/health_check.json
        rm -f /tmp/health_check.json
    else
        log_error "健康检查失败 (HTTP: $response)"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}$SERVICE_NAME 服务管理脚本${NC}"
    echo ""
    echo "用法: $0 {start|stop|restart|status|logs|health|help}"
    echo ""
    echo "命令说明:"
    echo "  start    - 启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务"
    echo "  status   - 查看服务状态"
    echo "  logs     - 查看日志 [access|error]"
    echo "  health   - 健康检查"
    echo "  help     - 显示帮助信息"
    echo ""
    echo "配置信息:"
    echo "  服务地址: http://$HOST:$PORT"
    echo "  PID文件: $PID_FILE"
    echo "  日志目录: $LOG_DIR"
    echo ""
    echo "示例:"
    echo "  $0 start              # 启动服务"
    echo "  $0 logs error         # 查看错误日志"
    echo "  $0 logs access        # 查看访问日志"
}

# 主程序
main() {
    case "${1:-help}" in
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
            status_service
            ;;
        "logs")
            show_logs "$2"
            ;;
        "health")
            health_check
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主程序
main "$@"