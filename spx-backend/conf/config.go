package conf

import (
	"github.com/joho/godotenv"
	"os"
)

var (
	Db         string
	DbHost     string
	DbPort     string
	DbUser     string
	DbPassword string
	DbName     string
)

func Init(envFilePath string, isCentral bool) {
	//Local reading of environment variables
	_ = godotenv.Load(envFilePath)

	//Mysql
	LoadMysql()
}
func LoadMysql() {
	Db = os.Getenv("DATABASE_TYPE")
	DbHost = os.Getenv("DATABASE_HOST")
	DbPort = os.Getenv("DATABASE_PORT")
	DbUser = os.Getenv("DATABASE_USER")
	DbPassword = os.Getenv("DATABASE_PASSWORD")
	DbName = os.Getenv("DATABASE_NAME")
}
