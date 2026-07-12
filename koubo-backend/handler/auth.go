package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"koubo-backend/repo"
	"net/http"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

type AuthHandler struct {
	userRepo    *repo.UserRepo
	wxAppID     string
	wxAppSecret string
}

func NewAuthHandler(userRepo *repo.UserRepo, wxAppID, wxAppSecret string) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, wxAppID: wxAppID, wxAppSecret: wxAppSecret}
}

type wxLoginReq struct {
	Code     string `json:"code"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar_url"`
}

type wxSession struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

// WxLogin handles POST /api/auth/wx-login
// Receives wx.login() code + optional nickname/avatar from getUserProfile
func (h *AuthHandler) WxLogin(ctx context.Context, c *app.RequestContext) {
	var req wxLoginReq
	if err := c.BindJSON(&req); err != nil || req.Code == "" {
		c.JSON(consts.StatusBadRequest, map[string]string{"error": "missing code"})
		return
	}

	openID, err := h.code2Session(req.Code)
	if err != nil {
		// Dev/simulator fallback: if no WX credentials configured, use code as fake openid
		if h.wxAppID == "" || h.wxAppSecret == "" {
			openID = "dev_" + req.Code
		} else {
			c.JSON(consts.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}

	user, err := h.userRepo.FindOrCreate(ctx, openID, "wechat")
	if err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	// Update nickname/avatar if provided
	if req.Nickname != "" || req.Avatar != "" {
		nickname := req.Nickname
		if nickname == "" {
			nickname = user.Nickname
		}
		avatar := req.Avatar
		if avatar == "" {
			avatar = user.AvatarURL
		}
		_ = h.userRepo.UpdateProfile(ctx, user.ID, nickname, avatar, user.Persona)
		user.Nickname = nickname
		user.AvatarURL = avatar
	}

	// Generate session token
	token := generateToken()
	if err := h.userRepo.UpdateToken(ctx, user.ID, token); err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]string{"error": "token error"})
		return
	}

	c.JSON(consts.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"token":      token,
			"user_id":    user.ID,
			"nickname":   user.Nickname,
			"avatar_url": user.AvatarURL,
			"persona":    user.Persona,
		},
	})
}

// UpdateProfile handles PATCH /api/auth/profile — updates nickname+avatar for authenticated user
func (h *AuthHandler) UpdateProfile(ctx context.Context, c *app.RequestContext) {
	token := extractToken(c)
	if token == "" {
		c.JSON(consts.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	user, err := h.userRepo.FindByToken(ctx, token)
	if err != nil {
		c.JSON(consts.StatusUnauthorized, map[string]string{"error": "invalid token"})
		return
	}

	var req struct {
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
		Persona   string `json:"persona"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(consts.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	if err := h.userRepo.UpdateProfile(ctx, user.ID, req.Nickname, req.AvatarURL, req.Persona); err != nil {
		c.JSON(consts.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	c.JSON(consts.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]string{
			"nickname":   req.Nickname,
			"avatar_url": req.AvatarURL,
			"persona":    req.Persona,
		},
	})
}

// GetProfile handles GET /api/auth/profile — returns current user profile
func (h *AuthHandler) GetProfile(ctx context.Context, c *app.RequestContext) {
	token := extractToken(c)
	if token == "" {
		c.JSON(consts.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	user, err := h.userRepo.FindByToken(ctx, token)
	if err != nil {
		c.JSON(consts.StatusUnauthorized, map[string]string{"error": "invalid token"})
		return
	}
	c.JSON(consts.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"user_id":    user.ID,
			"nickname":   user.Nickname,
			"avatar_url": user.AvatarURL,
			"persona":    user.Persona,
		},
	})
}

func (h *AuthHandler) code2Session(code string) (string, error) {
	url := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		h.wxAppID, h.wxAppSecret, code,
	)
	resp, err := http.Get(url) //nolint:noctx
	if err != nil {
		return "", fmt.Errorf("wx request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var s wxSession
	if err := json.Unmarshal(body, &s); err != nil {
		return "", fmt.Errorf("wx response parse failed: %w", err)
	}
	if s.ErrCode != 0 {
		return "", fmt.Errorf("wx error %d: %s", s.ErrCode, s.ErrMsg)
	}
	return s.OpenID, nil
}

func generateToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func extractToken(c *app.RequestContext) string {
	auth := string(c.GetHeader("Authorization"))
	if len(auth) > 7 && auth[:7] == "Bearer " {
		return auth[7:]
	}
	return ""
}
