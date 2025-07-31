package gormsentry

import (
	"context"
	"time"

	"github.com/getsentry/sentry-go"
	"gorm.io/gorm/logger"
)

// SentryLogger 实现 logger.Interface 接口，用于将 GORM 数据库操作记录到 Sentry
type SentryLogger struct {
	// 内部使用的 logger，可以设置为 logger.Discard 来避免控制台输出
	BaseLogger logger.Interface
	// 可选配置
	Config Config
}

// Config 定义 SentryLogger 的配置选项
type Config struct {
	// 是否记录 SQL 语句
	RecordSQL bool
	// 是否将 SQL 参数记录到 Sentry
	RecordParams bool
}

// DefaultConfig 返回默认配置
func DefaultConfig() Config {
	return Config{
		RecordSQL:    true,
		RecordParams: false, // 默认不记录参数，避免敏感信息泄露
	}
}

// New 创建一个新的 SentryLogger
func New(baseLogger logger.Interface, hub *sentry.Hub, config ...Config) *SentryLogger {
	if hub == nil {
		hub = sentry.CurrentHub()
	}

	if baseLogger == nil {
		baseLogger = logger.Discard
	}

	cfg := DefaultConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return &SentryLogger{
		BaseLogger: baseLogger,
		Config:     cfg,
	}
}

// LogMode 实现 logger.Interface 接口
func (l *SentryLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	newLogger.BaseLogger = l.BaseLogger.LogMode(level)
	return &newLogger
}

// Info 实现 logger.Interface 接口
func (l *SentryLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.BaseLogger.Info(ctx, msg, data...)
}

// Warn 实现 logger.Interface 接口
func (l *SentryLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.BaseLogger.Warn(ctx, msg, data...)
}

// Error 实现 logger.Interface 接口
func (l *SentryLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.BaseLogger.Error(ctx, msg, data...)
}

// Trace 实现 logger.Interface 接口，这是记录 SQL 执行信息的核心方法
func (l *SentryLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	// 首先调用基础 logger 的 Trace 方法
	l.BaseLogger.Trace(ctx, begin, fc, err)

	// 从上下文中获取或创建 Sentry transaction
	var span *sentry.Span
	tx := sentry.TransactionFromContext(ctx)

	if tx == nil {
		// 如果没有父事务，创建一个新的事务
		tx = sentry.StartTransaction(
			ctx,
			"gorm.execute",
			sentry.WithOpName("db.execute"),
			sentry.WithTransactionSource(sentry.SourceURL),
			sentry.WithDescription("database execute"),
		)
		span = tx
	} else {
		// 如果已有父事务，创建一个子 span
		span = tx.StartChild("db.execute")
	}

	// 设置开始时间以确保时间记录准确
	span.StartTime = begin

	// 获取 SQL 和影响的行数
	sql, rows := fc()

	// 设置 span 属性
	span.SetTag("db.system", "sql")

	if l.Config.RecordSQL {
		span.SetData("db.statement", sql)
	}

	span.SetData("db.rows_affected", rows)
	span.SetData("db.duration_ms", float64(time.Since(begin).Nanoseconds())/1e6)

	// 记录错误（如果有）
	if err != nil {
		span.Status = sentry.SpanStatusInternalError
		span.SetData("db.error", err.Error())
	} else {
		span.Status = sentry.SpanStatusOK
	}

	// 完成 span
	span.Finish()
}
