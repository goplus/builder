package controller

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setTestEnv(t *testing.T) {
	t.Setenv("GOP_SPX_DSN", "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True")
	t.Setenv("AIGC_ENDPOINT", "https://aigc.example.com")

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
	t.Setenv("GOP_CASDOOR_APPLICATIONNAME", "fake-application")
}

type mockCasdoorClient struct {
	casdoorClient casdoorClient
	jwt           string
}

func newMockCasdoorClient(casdoorClient casdoorClient, jwt string) *mockCasdoorClient {
	return &mockCasdoorClient{casdoorClient: casdoorClient, jwt: jwt}
}

func (m *mockCasdoorClient) ParseJwtToken(token string) (*casdoorsdk.Claims, error) {
	return m.casdoorClient.ParseJwtToken(token)
}

func (m *mockCasdoorClient) GetUser(name string) (*casdoorsdk.User, error) {
	claims, err := m.casdoorClient.ParseJwtToken(m.jwt)
	if err != nil {
		return nil, err
	}
	return &claims.User, nil
}

const fakeUserToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9." +
	"eyJvd25lciI6IkdvUGx1cyIsIm5hbWUiOiJmYWtlLW5hbWUiLCJpZCI6IjEiLCJpc3MiOiJHb1BsdXMiLCJzdWIiOiIxIiwiZXhwIjo0ODcwNDI5MDQwfQ." +
	"X0T-v-RJggMRy3Mmui2FoRH-_4DQsNA6DekUx1BfIljTZaEbHbuW59dSlKQ-i2MuYD7_8mI18vZqT3iysbKQ1T70NF97B_A130ML3pulZWlj1ZokgjCkVug25QRbq_N7JMd4apJZFlyZj8Bd2VfqtAKMlJJ4HzKzNXB-GBogDVlKeu4xJ1BiXO2rHL1PNa5KyKLSSMXmuP_Wc108RXZ0BiKDE30IG1fvcyvudXcetmltuWjuU6JRj3FGedxuVEqZLXqcm13dCxHnuFV1x1XU9KExcDvVyVB91FpBe5npzYp6WMX0fx9vU1b4eJ69EZoeMdMolhmvYInT1G8r1PEmbg"

func newTestController(t *testing.T) (ctrl *Controller, dbMock sqlmock.Sqlmock, closeDB func() error) {
	setTestEnv(t)

	logger := log.GetLogger()
	kodoConfig := newKodoConfig(logger)
	aigcClient := aigc.NewAigcClient(mustEnv(logger, "AIGC_ENDPOINT"))
	casdoorClient := newMockCasdoorClient(newCasdoorClient(logger), fakeUserToken)

	db, dbMock, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	return &Controller{
		db:            db,
		kodo:          kodoConfig,
		aigcClient:    aigcClient,
		casdoorClient: casdoorClient,
	}, dbMock, closeDB
}

func TestSortOrder(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, SortOrderAsc.IsValid())
		assert.True(t, SortOrderDesc.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, SortOrder("invalid").IsValid())
	})
}

func TestPagination(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 20}
		assert.True(t, p.IsValid())
	})

	t.Run("InvalidIndex", func(t *testing.T) {
		p := Pagination{Index: 0, Size: 20}
		assert.False(t, p.IsValid())
	})

	t.Run("InvalidSize", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 0}
		assert.False(t, p.IsValid())
	})

	t.Run("SizeExceedsMaximum", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 101}
		assert.False(t, p.IsValid())
	})

	t.Run("Offset", func(t *testing.T) {
		p := Pagination{Index: 3, Size: 20}
		assert.Equal(t, 40, p.Offset())
	})
}

func stringPtr(s string) *string {
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}
