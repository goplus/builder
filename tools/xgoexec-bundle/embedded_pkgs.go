package main

//go:generate go tool qexp -outdir internal/pkg github.com/goplus/builder/tools/tutorial

import (
	_ "github.com/goplus/builder/tools/xgoexec-bundle/internal/pkg/github.com/goplus/builder/tools/tutorial"
	_ "github.com/goplus/ixgo/pkg/bytes"
	_ "github.com/goplus/ixgo/pkg/encoding/json"
	_ "github.com/goplus/ixgo/pkg/errors"
	_ "github.com/goplus/ixgo/pkg/fmt"
	_ "github.com/goplus/ixgo/pkg/io"
	_ "github.com/goplus/ixgo/pkg/math"
	_ "github.com/goplus/ixgo/pkg/math/rand"
	_ "github.com/goplus/ixgo/pkg/sort"
	_ "github.com/goplus/ixgo/pkg/strconv"
	_ "github.com/goplus/ixgo/pkg/strings"
	_ "github.com/goplus/ixgo/pkg/time"
)
