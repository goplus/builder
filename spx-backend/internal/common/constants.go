package common

const (
	PUBLIC   = 1
	PERSONAL = 0
)
const (
	SUCCESS                 = 200
	NoLogin                 = 401
	ERROR                   = 500
	ErrorProjectNotFound    = 10001
	ErrorDeleteProject      = 10002
	ErrorUpdateProjectState = 10003
	ErrorGetAsset           = 10004

	ErrorPermissions        = 20001
	ErrorParseMultipartForm = 20002
	ErrorImagesToGif        = 20003
)

var MsgFlags = map[int]string{
	SUCCESS: "ok",
	ERROR:   "Fail",
	NoLogin: "Unauthorized",

	ErrorProjectNotFound:    "Project not found",
	ErrorDeleteProject:      "Delete error",
	ErrorUpdateProjectState: "Update project is_public error",
	ErrorGetAsset:           "Get asset error",

	ErrorPermissions:        "No Permissions",
	ErrorParseMultipartForm: "Parse Multipart Form Error",
	ErrorImagesToGif:        "Generate gif error",
}

// GetMsg 获取状态码对应信息
func GetMsg(code int) string {
	msg, ok := MsgFlags[code]
	if ok {
		return msg
	}
	return MsgFlags[ERROR]
}
