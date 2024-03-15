package model

import (
	"database/sql"
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
)

const (
	PERSONAL = 0
	PUBLIC   = 1

	SPRITE     = "0"
	BACKGROUND = "1"
	SOUND      = "2"
)

type AssetAddressData map[string]string

type Asset struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	AuthorId       string    `json:"authorId"`
	Category       string    `json:"category"`
	IsPublic       int       `json:"isPublic"` // 1:Public state 0: Personal state
	Address        string    `json:"address"`  // The partial path of the asset's location, excluding the host. like 'sprite/xxx.svg'
	PreviewAddress string    `json:"previewAddress"`
	AssetType      string    `json:"assetType"` // 0：sprite，1：background，2：sound
	ClickCount     string    `json:"clickCount"`
	Status         int       `json:"status"` // 1:Normal state 0:Deleted status
	CTime          time.Time `json:"cTime"`
	UTime          time.Time `json:"uTime"`
}

type Project struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	AuthorId string    `json:"authorId"`
	Address  string    `json:"address"`
	IsPublic int       `json:"isPublic"`
	Status   int       `json:"status"`
	Version  int       `json:"version"`
	Ctime    time.Time `json:"cTime"`
	Utime    time.Time `json:"uTime"`
}

type FilterCondition struct {
	Column    string      // column name
	Operation string      //  "=", "<", "!=" ...
	Value     interface{} // value
}

type OrderByCondition struct {
	Column    string // column name
	Direction string // ASC or DESC
}

type Pagination[T any] struct {
	TotalCount int `json:"totalCount"`
	TotalPage  int `json:"totalPage"`
	Data       []T `json:"data"`
}

// QueryByPage retrieves a paginated list of items from the database according to the provided filters and order conditions.
func QueryByPage[T any](db *sql.DB, pageIndexParam string, pageSizeParam string, filters []FilterCondition, orderBy []OrderByCondition) (*Pagination[T], error) {
	pageIndex, err := strconv.Atoi(pageIndexParam)
	if err != nil {
		return nil, err
	}

	pageSize, err := strconv.Atoi(pageSizeParam)
	if err != nil {
		return nil, err
	}

	tableName := getTableName[T]()
	scan := tScan[T]()
	whereClause, args := buildWhereClause(filters)
	orderByClause := buildOrderByClause(orderBy)

	var totalCount int
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s %s`, tableName, whereClause)
	argsForCount := append([]interface{}{}, args...)
	err = db.QueryRow(countQuery, argsForCount...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}
	totalPage := (totalCount + pageSize - 1) / pageSize

	offset := (pageIndex - 1) * pageSize
	query := fmt.Sprintf("SELECT * FROM %s %s %s LIMIT ?, ?", tableName, whereClause, orderByClause)

	argsForQuery := append(args, offset, pageSize)
	rows, err := db.Query(query, argsForQuery...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []T
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		data = append(data, item)
	}

	return &Pagination[T]{
		TotalCount: totalCount,
		TotalPage:  totalPage,
		Data:       data,
	}, nil
}

// QueryById common select by id query
func QueryById[T any](db *sql.DB, id string) (*T, error) {
	wheres := []FilterCondition{{Column: "id", Operation: "=", Value: id}}
	results, err := QuerySelect[T](db, wheres)
	if len(results) == 0 {
		return nil, err
	}
	return &results[0], nil
}

// tScan Creates and returns a scan that applies to any struct
func tScan[T any]() func(rows *sql.Rows) (T, error) {
	return func(rows *sql.Rows) (T, error) {
		var item T
		itemVal := reflect.ValueOf(&item).Elem()
		if itemVal.Kind() != reflect.Struct {
			return item, errors.New("item must be a struct")
		}

		columns, err := rows.Columns()
		if err != nil {
			return item, err
		}

		if len(columns) != itemVal.NumField() {
			return item, errors.New("number of columns does not match struct fields")
		}

		columnPointers := make([]interface{}, len(columns))
		for i := 0; i < len(columns); i++ {
			field := itemVal.Field(i)
			if !field.CanSet() {
				return item, errors.New("cannot set struct field " + columns[i])
			}
			columnPointers[i] = field.Addr().Interface()
		}

		if err := rows.Scan(columnPointers...); err != nil {
			return item, err
		}

		return item, nil
	}
}

// QuerySelect common select query, can customize the wheres
func QuerySelect[T any](db *sql.DB, filters []FilterCondition) ([]T, error) {
	tableName := getTableName[T]()
	scan := tScan[T]()
	whereClause, args := buildWhereClause(filters)

	query := fmt.Sprintf("SELECT * FROM %s%s", tableName, whereClause)
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []T
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, item)
	}

	return results, nil
}

// buildWhereClause Build a WHERE clause based on FilterCondition
func buildWhereClause(conditions []FilterCondition) (string, []interface{}) {
	var whereClauses []string
	var args []interface{}

	for _, condition := range conditions {
		whereClauses = append(whereClauses, fmt.Sprintf("%s %s ?", condition.Column, condition.Operation))
		args = append(args, condition.Value)
	}

	// select undelete result
	whereClauses = append(whereClauses, "status != ?")
	args = append(args, 0)

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ") // TODO support "or"
	}

	return whereClause, args
}

// buildOrderByClause builds an ORDER BY clause based on OrderByCondition
func buildOrderByClause(orders []OrderByCondition) string {
	if len(orders) == 0 {
		return ""
	}

	var orderClauses []string
	for _, order := range orders {
		orderClauses = append(orderClauses, fmt.Sprintf("%s %s", order.Column, order.Direction))
	}

	return " ORDER BY " + strings.Join(orderClauses, ", ")
}

// getTableName Get the table name based on reflection
func getTableName[T any]() string {
	return strings.ToLower(reflect.TypeOf((*T)(nil)).Elem().Name())
}

// QueryPageBySQL
func QueryPageBySQL[T any](db *sql.DB, sqlQuery string, pageIndexParam string, pageSizeParam string, args []interface{}) (*Pagination[T], error) {
	pageIndex, err := strconv.Atoi(pageIndexParam)
	if err != nil {
		return nil, err
	}
	pageSize, err := strconv.Atoi(pageSizeParam)
	if err != nil {
		return nil, err
	}
	// Calculate total count for pagination
	var totalCount int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM (%s) AS count_table", sqlQuery)
	argsForCount := append([]interface{}{}, args...)
	err = db.QueryRow(countQuery, argsForCount...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}
	totalPage := (totalCount + pageSize - 1) / pageSize
	// Execute the paginated query
	offset := (pageIndex - 1) * pageSize
	paginatedQuery := fmt.Sprintf("%s LIMIT ? OFFSET ?", sqlQuery)
	argsForQuery := append(args, pageSize, offset)
	rows, err := db.Query(paginatedQuery, argsForQuery...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	// Scan rows into the struct T
	var data []T
	scan := tScan[T]()
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		data = append(data, item)
	}
	return &Pagination[T]{
		TotalCount: totalCount,
		TotalPage:  totalPage,
		Data:       data,
	}, nil
}

func AddAsset(db *sql.DB, c *Asset) (string, error) {
	sqlStr := "insert into asset (name,author_id , address,preview_address,is_public,status,asset_type,category, c_time,u_time) values (?, ?, ?,?,?,?, ?,?,?, ?)"
	res, err := db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, c.PreviewAddress, c.IsPublic, c.Status, c.AssetType, c.Category, time.Now(), time.Now())
	if err != nil {
		fmt.Printf("failed to add Asset : %v", err)
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func UpdateProject(db *sql.DB, c *Project) error {
	stmt, err := db.Prepare("UPDATE project SET version =?, name = ?,address = ? ,u_time = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(c.Version, c.Name, c.Address, time.Now(), c.ID)
	return err
}
func UpdateProjectIsPublic(db *sql.DB, id string, isPublic string) error {
	query := "UPDATE project SET is_public = ? WHERE id = ?"
	_, err := db.Exec(query, isPublic, id)
	if err != nil {
		fmt.Printf("failed to exec update ispublic : %v", err)
		return err
	}
	return nil
}
func AddProject(db *sql.DB, c *Project) (string, error) {
	sqlStr := "insert into project (name,author_id , address,is_public, status,c_time,u_time) values (?, ?,?, ?, ?,?, ?)"
	res, err := db.Exec(sqlStr, c.Name, c.AuthorId, c.Address, c.IsPublic, c.Status, c.Ctime, c.Utime)
	if err != nil {
		fmt.Printf("failed to exec add project : %v", err)
		return "", err
	}
	idInt, err := res.LastInsertId()
	return strconv.Itoa(int(idInt)), err
}

func DeleteProjectById(db *sql.DB, id string) error {
	query := "UPDATE project SET status = ? WHERE id = ?"
	_, err := db.Exec(query, 0, id)
	if err != nil {
		fmt.Printf("failed to exec delete project id = %v : %v", id, err)
		return err
	}
	return nil
}
func DeleteAssetById(db *sql.DB, id string) error {
	query := "UPDATE asset SET status = ? WHERE id = ?"
	_, err := db.Exec(query, 0, id)
	if err != nil {
		fmt.Printf("failed to exec delete asset id = %v : %v", id, err)
		return err
	}
	return nil
}
