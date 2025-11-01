# 模板管理系统

这是一个完整的PSD图层和设计模板管理系统，允许用户保存、管理和重复使用常用的设计元素。

## 功能特性

### 🎨 模板类型支持
- **PSD图层模板**: 保存PSD文件中的单个图层
- **图片模板**: 保存图片文件
- **文字样式模板**: 保存文字格式和样式
- **图层组模板**: 保存多个图层的组合
- **画布元素模板**: 保存画布中的设计元素

### 📁 分类管理
- 创建和管理模板分类
- 自定义分类颜色和图标
- 支持分类的增删改查

### 🔍 搜索和筛选
- 全文搜索模板名称和描述
- 按类型、分类、标签筛选
- 收藏夹功能
- 公开/私有模板筛选

### 📊 统计和分析
- 模板使用次数统计
- 热门模板排行
- 最近创建的模板
- 总体统计数据

### 🎯 快速操作
- 一键保存PSD图层为模板
- 快速应用模板到画布
- 批量操作（收藏、删除等）
- 模板复制和分享

## 组件结构

```
react/src/components/template/
├── TemplateManager.tsx          # 主模板管理界面
├── TemplateCard.tsx             # 模板卡片组件
├── TemplateUploadDialog.tsx      # 模板上传对话框
├── TemplateSearchFilters.tsx    # 搜索筛选组件
├── TemplateCategoryManager.tsx  # 分类管理组件
├── TemplateButton.tsx           # 模板按钮组件
└── TemplateDashboard.tsx       # 模板仪表板
```

## API接口

### 分类管理
- `GET /api/templates/categories` - 获取所有分类
- `POST /api/templates/categories` - 创建新分类
- `PUT /api/templates/categories/{id}` - 更新分类
- `DELETE /api/templates/categories/{id}` - 删除分类

### 模板管理
- `GET /api/templates/items` - 获取模板列表
- `GET /api/templates/items/{id}` - 获取单个模板
- `POST /api/templates/items` - 创建新模板
- `PUT /api/templates/items/{id}` - 更新模板
- `DELETE /api/templates/items/{id}` - 删除模板
- `POST /api/templates/items/{id}/favorite` - 切换收藏状态
- `POST /api/templates/items/{id}/usage` - 增加使用次数

### 特殊功能
- `POST /api/templates/from-psd-layer` - 从PSD图层创建模板
- `POST /api/templates/apply-to-canvas` - 应用模板到画布
- `GET /api/templates/search` - 搜索模板
- `GET /api/templates/stats` - 获取统计信息

## 使用方法

### 1. 在PSD图层侧边栏中使用

```tsx
import { PSDLayerSidebar } from '@/components/canvas/PSDLayerSidebar'

// PSD图层侧边栏已经集成了模板功能
<PSDLayerSidebar
  psdData={psdData}
  isVisible={isVisible}
  onClose={onClose}
  onUpdate={onUpdate}
/>
```

### 2. 使用模板按钮组件

```tsx
import { TemplateButton } from '@/components/template/TemplateButton'

<TemplateButton
  onApplyTemplate={(template) => {
    console.log('应用模板:', template)
  }}
/>
```

### 3. 使用模板仪表板

```tsx
import { TemplateDashboard } from '@/components/template/TemplateDashboard'

<TemplateDashboard
  onApplyTemplate={(template) => {
    console.log('应用模板:', template)
  }}
/>
```

### 4. 直接使用模板管理器

```tsx
import { TemplateManager } from '@/components/template/TemplateManager'

<TemplateManager
  isOpen={showTemplateManager}
  onClose={() => setShowTemplateManager(false)}
  onApplyTemplate={(template) => {
    console.log('应用模板:', template)
  }}
/>
```

## 数据库结构

### TemplateCategory (分类表)
- `id`: 分类ID
- `name`: 分类名称
- `description`: 分类描述
- `icon`: 分类图标
- `color`: 分类颜色
- `created_at`: 创建时间
- `updated_at`: 更新时间

### TemplateItem (模板表)
- `id`: 模板ID
- `name`: 模板名称
- `description`: 模板描述
- `category_id`: 分类ID
- `type`: 模板类型
- `thumbnail_url`: 缩略图URL
- `preview_url`: 预览图URL
- `metadata`: 元数据(JSON)
- `tags`: 标签列表(JSON)
- `usage_count`: 使用次数
- `is_favorite`: 是否收藏
- `is_public`: 是否公开
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `created_by`: 创建者

### TemplateCollection (集合表)
- `id`: 集合ID
- `name`: 集合名称
- `description`: 集合描述
- `template_ids`: 模板ID列表(JSON)
- `thumbnail_url`: 缩略图URL
- `is_public`: 是否公开
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `created_by`: 创建者

## 文件存储

模板相关的文件存储在 `user_data/template_uploads/` 目录下：
- `thumbnails/`: 缩略图文件
- `previews/`: 预览图文件

## 配置说明

1. **数据库**: 使用SQLite数据库，文件位置为 `user_data/templates.db`
2. **文件上传**: 支持图片格式的缩略图和预览图
3. **权限控制**: 支持公开和私有模板设置
4. **搜索**: 支持全文搜索和多种筛选条件

## 扩展功能

### 未来可以添加的功能：
1. **模板版本管理**: 支持模板的版本控制
2. **模板分享**: 支持模板的导入导出
3. **协作功能**: 支持团队共享模板
4. **AI推荐**: 基于使用习惯推荐相关模板
5. **模板市场**: 公共模板库和社区分享

## 注意事项

1. 确保后端服务正常运行
2. 数据库文件会自动创建
3. 上传的文件会保存在本地
4. 模板应用功能需要与画布系统集成
5. 建议定期备份模板数据

## 故障排除

### 常见问题：
1. **模板无法保存**: 检查后端API是否正常运行
2. **图片无法显示**: 检查文件路径和权限
3. **搜索无结果**: 检查数据库连接和索引
4. **性能问题**: 考虑添加分页和缓存机制

这个模板管理系统提供了完整的设计元素管理功能，可以大大提高设计工作的效率和一致性。
