package repo

import (
	"koubo-backend/model"
	"testing"
)

func TestTemplateModelFields(t *testing.T) {
	tmpl := model.Template{
		ID:               "abc",
		Title:            "test",
		Domain:           "product",
		ContentStructure: "hook + body + cta",
		UsageCount:       5,
		IsFeatured:       true,
	}
	if tmpl.ID != "abc" {
		t.Error("ID mismatch")
	}
	if tmpl.UsageCount != 5 {
		t.Error("UsageCount mismatch")
	}
}
