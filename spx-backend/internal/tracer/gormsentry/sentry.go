package gormsentry

import (
	"context"
	"time"

	"github.com/getsentry/sentry-go"
	"gorm.io/gorm/logger"
)

// SentryLogger implements logger.Interface for recording GORM database operations to Sentry
type SentryLogger struct {
	// BaseLogger is the internal logger, can be set to logger.Discard to avoid console output
	BaseLogger logger.Interface
	// Config contains optional configuration options
	Config Config
}

// Config defines configuration options for SentryLogger
type Config struct {
	// RecordSQL determines whether to record SQL statements
	RecordSQL bool
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	return Config{
		RecordSQL: true,
	}
}

// New creates a new SentryLogger
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

// LogMode implements logger.Interface
func (l *SentryLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	newLogger.BaseLogger = l.BaseLogger.LogMode(level)
	return &newLogger
}

// Info implements logger.Interface
func (l *SentryLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.BaseLogger.Info(ctx, msg, data...)
}

// Warn implements logger.Interface
func (l *SentryLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.BaseLogger.Warn(ctx, msg, data...)
}

// Error implements logger.Interface
func (l *SentryLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.BaseLogger.Error(ctx, msg, data...)
}

// Trace implements logger.Interface, this is the core method for recording SQL execution information
func (l *SentryLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	// First call the base logger's Trace method
	l.BaseLogger.Trace(ctx, begin, fc, err)

	// Get or create a Sentry transaction from context
	var span *sentry.Span
	tx := sentry.TransactionFromContext(ctx)

	if tx == nil {
		// If there's no parent transaction, create a new one
		tx = sentry.StartTransaction(
			ctx,
			"gorm.execute",
			sentry.WithOpName("db.execute"),
			sentry.WithTransactionSource(sentry.SourceURL),
			sentry.WithDescription("database execute"),
		)
		span = tx
	} else {
		// If there's already a parent transaction, create a child span
		span = tx.StartChild("db.execute", sentry.WithDescription("database execute"))
	}

	// Set start time to ensure accurate time recording
	span.StartTime = begin

	// Get SQL and number of affected rows
	sql, rows := fc()

	// Set span attributes
	span.SetTag("db.system", "sql")

	if l.Config.RecordSQL {
		span.SetData("db.statement", sql)
	}

	span.SetData("db.rows_affected", rows)
	span.SetData("db.duration_ms", float64(time.Since(begin).Nanoseconds())/1e6)

	// Record error (if any)
	if err != nil {
		span.Status = sentry.SpanStatusInternalError
		span.SetData("db.error", err.Error())
	} else {
		span.Status = sentry.SpanStatusOK
	}

	// Finish the span
	span.Finish()
}
