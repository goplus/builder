package controller

import "github.com/goplus/builder/spx-backend/internal/model"

// SampleGameAssets provides sample asset names for auto-completion
var SampleGameAssets = []model.GameAsset{
	// 角色类
	{Name: "像素风格可爱猫咪角色"},
	{Name: "像素风格勇敢骑士角色"},
	{Name: "像素风格魔法师角色"},
	{Name: "卡通机器人角色"},
	{Name: "卡通小熊角色"},
	{Name: "卡通公主角色"},
	
	// 场景类
	{Name: "像素城市背景"},
	{Name: "像素森林背景"},
	{Name: "像素山脉背景"},
	{Name: "卡通森林背景"},
	{Name: "卡通海滩背景"},
	{Name: "卡通太空背景"},
	
	// 道具类
	{Name: "像素金币道具"},
	{Name: "像素宝石道具"},
	{Name: "像素钥匙道具"},
	{Name: "卡通魔法药水"},
	{Name: "卡通能量水晶"},
	{Name: "卡通盾牌道具"},
	
	// 平台类
	{Name: "像素跳跃平台"},
	{Name: "像素移动平台"},
	{Name: "卡通云朵平台"},
	{Name: "卡通弹簧平台"},
}