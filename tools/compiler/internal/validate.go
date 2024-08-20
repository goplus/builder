package internal

import (
	"regexp"
)

type stringPatterns string

const (
	camelCase  stringPatterns = "camelCase"  // camelCase
	pascalCase stringPatterns = "pascalCase" // PascalCase
	snackCase  stringPatterns = "snackCase"  // snack_case
	upperSnake stringPatterns = "upperSnake" // UPPER_SNAKE
)

type patternsMap map[stringPatterns]*regexp.Regexp

var patterns = patternsMap{
	camelCase:  regexp.MustCompile(`^[a-z]+(?:[A-Z][a-z]*)*$`),
	pascalCase: regexp.MustCompile(`^[A-Z][a-z]*(?:[A-Z][a-z]*)*$`),
	snackCase:  regexp.MustCompile(`^[a-z]+(_[a-z]+)*$`),
	upperSnake: regexp.MustCompile(`^[A-Z]+(_[A-Z]+)*$`),
}

type StringChecker struct {
	baseString   string
	pattern      stringPatterns
	stringWords  []string
	changeString string
}

func NewStringChecker(s string) *StringChecker {
	sc := &StringChecker{
		baseString:   s,
		changeString: s,
	}
	sc.checkPatter()
	return sc
}

func (checker *StringChecker) checkPatter() (stringPatterns, bool) {
	for style, pattern := range patterns {
		if pattern.MatchString(checker.baseString) {
			checker.pattern = style
			return style, true
		}
	}
	return "", false
}

func (checker *StringChecker) splitStrings() {
}

func (checker *StringChecker) CamelCase() string {
	if checker.pattern == camelCase {
		return checker.baseString
	}
	return ""
}

func (checker *StringChecker) PascalCase() string {
	if checker.pattern == pascalCase {
		return checker.baseString
	}
	return ""
}

func (checker *StringChecker) SnackCase() string {
	if checker.pattern == snackCase {
		return checker.baseString
	}
	return ""
}

func (checker *StringChecker) UpperSnake() string {
	if checker.pattern == upperSnake {
		return checker.baseString
	}
	return ""
}
