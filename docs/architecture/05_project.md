# Backend Module

## Module purpose
  This module is primarily responsible for the saving, uploading, modifying, deleting, and querying of spx project files and assets.
  
## Module scope
 The module retrieves project and resource information from the database and returns the information to the caller. It fetches file information stored in the cloud from Qiniu's KODO and displays the information on the frontend.
 
## Module structure
```go=
type Asset struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AuthorId  string    `json:"authorId"`
	Category  string    `json:"category"`
	IsPublic  int       `json:"isPublic"`
	Address   string    `json:"address"`
	AssetType string    `json:"assetType"`
	Status    int       `json:"status"`
	CTime     time.Time `json:"cTime"`
	UTime     time.Time `json:"uTime"`
}

type CodeFile struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	AuthorId string
	Address  string
	IsPublic int
	Status   int
	Ctime    time.Time
	Utime    time.Time
}
```
## Functions
### Upload and save

```go=
// Save project file
func (p *Project) SaveProject(ctx context.Context, codeFile *CodeFile, file multipart.File, header *multipart.FileHeader) (*CodeFile, error) {}
// Upload asset 
func (p *Project) UploadAsset(ctx context.Context, asset *Asset, file multipart.File, header *multipart.FileHeader) (*Asset, error) {}
```

### Get Project/Asset Info

```go=
// Get asset
func (p *Project) Asset(ctx context.Context, id string) (*Asset, error) {}
// Get assets list
func (p *Project) AssetList(ctx context.Context, pageIndex string, pageSize string, assetType string) (*common.Pagination[Asset], error) {}
// Get project 
func (p *Project) FileInfo(ctx context.Context, id string) (*CodeFile, error) {}
// Get public project list
func (p *Project) PubProjectList(ctx context.Context, pageIndex string, pageSize string) (*common.Pagination[CodeFile], error) {}
// Get personal project list
func (p *Project) UserProjectList(ctx context.Context, pageIndex string, pageSize string, uid string) (*common.Pagination[CodeFile], error) {}
// Search asset
func (p *Project) SearchAsset(ctx context.Context, search string, assetType string) ([]*Asset, error)
```
