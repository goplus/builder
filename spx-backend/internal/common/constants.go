package common

const (
	PERSONAL = 0
	PUBLIC   = 1

	SPRITE     = "0"
	BACKGROUND = "1"
	SOUND      = "2"
)
const (
	SUCCESS              = 200
	NoLogin              = 401
	ERROR                = 500
	ErrorProjectNotFound = 10001
	ErrorDelete          = 10002
	ErrorUpdateState     = 10003
	ErrorGetAsset        = 10004
	ErrorSave            = 10005
	ErrorGetProjects     = 10006
	ErrClick             = 10007

	ErrorPermissions        = 20001
	ErrorParseMultipartForm = 20002
	ErrorImagesToGif        = 20003
	ErrorUpload             = 20004
	ErrorNameNotNull        = 20005
)

var MsgFlags = map[int]string{
	SUCCESS: "ok",
	ERROR:   "Fail",
	NoLogin: "Unauthorized",

	ErrorProjectNotFound: "Project not found",
	ErrorDelete:          "Delete error",
	ErrorUpdateState:     "Update is_public error",
	ErrorGetAsset:        "Get asset error",
	ErrorGetProjects:     "Get projects error",
	ErrClick:             "Click err",

	ErrorPermissions:        "No Permissions",
	ErrorParseMultipartForm: "Parse Multipart Form Error",
	ErrorImagesToGif:        "Generate gif error",
	ErrorUpload:             "Upload err",
	ErrorNameNotNull:        "please fill name",
	ErrorSave:               "save err",
}

// GetMsg 获取状态码对应信息
func GetMsg(code int) string {
	msg, ok := MsgFlags[code]
	if ok {
		return msg
	}
	return MsgFlags[ERROR]
}
