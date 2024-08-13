package controller

import (
	"context"
	"github.com/qiniu/x/log"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setTestEnv(t *testing.T) {
	t.Setenv("GOP_SPX_DSN", "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True")
	t.Setenv("AIGC_ENDPOINT", "https://aigc.example.com")
	t.Setenv("ENV", "test")

	t.Setenv("KODO_AK", "fake-kodo-ak")
	t.Setenv("KODO_SK", "fake-kodo-sk")
	t.Setenv("KODO_BUCKET", "builder")
	t.Setenv("KODO_BUCKET_REGION", "earth")
	t.Setenv("KODO_BASE_URL", "https://kodo.example.com")

	t.Setenv("GOP_CASDOOR_ENDPOINT", "https://casdoor.example.com")
	t.Setenv("GOP_CASDOOR_CLIENTID", "fake-client-id")
	t.Setenv("GOP_CASDOOR_CLIENTSECRET", "fake-client-secret")
	t.Setenv("GOP_CASDOOR_CERTIFICATE", `-----BEGIN CERTIFICATE-----
MIIDDDCCAfSgAwIBAgIPJTPotE6tfuppFEL608kZMA0GCSqGSIb3DQEBCwUAMCYx
DzANBgNVBAoTBkdvUGx1czETMBEGA1UEAxMKZ29wbHVzLm9yZzAgFw0yNDA1Mjcx
NjU3MjBaGA8yMTI0MDUwMzE2NTcyMFowJjEPMA0GA1UEChMGR29QbHVzMRMwEQYD
VQQDEwpnb3BsdXMub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
0YRGxHFxL8Nkw5EiUhKaqB6NV4NuE98Nj6YL941GPLBeQLijyfJ2ErpWIqz7Hwzn
NVo76qPSKi/BpGw+EL4EgiWokW+Aw4lElkd7gnd/annQ3W6AC9v0bN7FPZUfpFAH
NmhveFfM5K78GXQqCEFeV+kxqxym4qhtCCK7Tb0uJ1dalX2INiANMJ5YfKWmjrkG
Mh9fGzw0+SL9gB1gkREap1Z2vwRD2HEuQd4J5G1YFyFkrISbI4X8xTVn6dSPUbCk
2aM9Fmg/ExD9mt7m3Klxm6iOnLojs1cRlFcexQtTjPbTnyKWtWSzF9WIegZC7aL9
MwKN0mqvXyE8wnv4M/l72wIDAQABozUwMzAOBgNVHQ8BAf8EBAMCBaAwEwYDVR0l
BAwwCgYIKwYBBQUHAwEwDAYDVR0TAQH/BAIwADANBgkqhkiG9w0BAQsFAAOCAQEA
TpnkzMMKWceK7LScYuIcXEqCOwmzhT6yNRNTHzplta7NznjCVCL+kGffRlUQhdsN
pVGKPWbisd6y43IaokrkWOEPwhdWNa2rK9U7zYhI+9gGbqO02gJUw/gFIEjwO84J
uPrfGhKFB+ckitTWslFGf1d/Dt/MYS544QlB06IW8f+AM7z0sohh5nGH8lQIOmLC
7zQdehTX3TTuydAgBmU7a8oiM10t4Xw5alyy23Mo1qzZaZ1qHc2feJ8r9w1codAt
3c666GQTCYyifHL1dV2F5KullyFZ86SiOw3VDQ9D34Yd6YMvtBMkAjh7UZxMvun2
VTh1XIl/IELBoZ+rQXozGA==
-----END CERTIFICATE-----`)
	t.Setenv("GOP_CASDOOR_ORGANIZATIONNAME", "fake-organization")
	t.Setenv("GOP_CASDOOR_APPLICATONNAME", "fake-application")
}

func newTestController(t *testing.T) (*Controller, sqlmock.Sqlmock, error) {
	setTestEnv(t)

	db, mock, err := sqlmock.New()
	if err != nil {
		return nil, nil, err
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)
	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      db,
		SkipInitializeWithVersion: true, // Skip initializing database with version,avoiding the error "Error 1046: No database selected"
	}), &gorm.Config{
		Logger: newLogger,
	})

	ctrl, err := New(context.Background())
	if err != nil {
		return nil, nil, err
	}

	require.NoError(t, err)
	ctrl.db = db
	ctrl.ormDb = gormDB

	t.Cleanup(func() {
		db.Close()
	})
	return ctrl, mock, nil
}

func TestNew(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		setTestEnv(t)
		ctrl, err := New(context.Background())
		require.NoError(t, err)
		require.NotNil(t, ctrl)
	})

	t.Run("InvalidDSN", func(t *testing.T) {
		setTestEnv(t)
		t.Setenv("GOP_SPX_DSN", "invalid-dsn")
		ctrl, err := New(context.Background())
		require.Error(t, err)
		assert.EqualError(t, err, "invalid DSN: missing the slash separating the database name")
		require.Nil(t, ctrl)
	})
}
