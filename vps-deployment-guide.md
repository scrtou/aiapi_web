# 在 VPS 上后台运行 aiapi_web 服务指南

为了在您的 VPS 上以后台服务的方式运行 `aiapi_web`，您可以遵循以下步骤。我们将使用 `pm2`，一个流行的 Node.js 进程管理器，来保持您的服务持续运行。

## 1. 准备您的 VPS 环境

首先，请确保您的 VPS 上已经安装了 [Node.js](https://nodejs.org/) 和 `npm`。

然后，将您的 `aiapi_web` 项目文件上传到 VPS 的一个目录中，例如 `/home/user/aiapi_web`。

## 2. 安装依赖并构建项目

进入您的项目目录，然后执行以下命令：

```bash
# 进入项目目录
cd /path/to/your/aiapi_web

# 安装项目依赖
npm install

# 构建项目
npm run build
```

`npm run build` 命令会创建一个 `dist` 文件夹，其中包含了您的静态网站文件。

## 3. 安装 pm2

`pm2` 是一个强大的进程管理器，可以帮助您在后台运行、监控和自动重启您的应用。

在您的 VPS 上全局安装 `pm2`：

```bash
npm install -g pm2
```

## 4. 使用 pm2 启动服务

现在，您可以使用 `pm2` 来启动 Vite 的预览服务器，它将为您的 `dist` 文件夹提供服务。

```bash
# 使用 pm2 启动服务
pm2 start npm --name "aiapi-web" -- run preview
```

- `pm2 start npm`: 告诉 `pm2` 使用 `npm` 来启动应用。
- `--name "aiapi-web"`: 为您的服务指定一个名称，方便后续管理。
- `-- run preview`: 执行 `package.json` 中定义的 `preview` 脚本。

现在您的服务已经在后台运行了。您可以通过 `http://<您的VPS_IP>:3000` 来访问它 (请确保您的 VPS 防火墙已开放 3000 端口)。

## 5. 管理您的服务

以下是一些常用的 `pm2` 命令：

- **查看服务状态:**
  ```bash
  pm2 list
  ```

- **查看日志:**
  ```bash
  pm2 logs aiapi-web
  ```

- **停止服务:**
  ```bash
  pm2 stop aiapi-web
  ```

- **重启服务:**
  ```bash
  pm2 restart aiapi-web
  ```

- **删除服务:**
  ```bash
  pm2 delete aiapi-web
  ```

## 6. (可选) 设置开机自启

为了让您的服务在 VPS 重启后自动运行，您可以执行以下命令：

```bash
# 生成开机自启脚本
pm2 startup

# 保存当前 pm2 进程列表
pm2 save
```

`pm2 startup` 会生成一行命令，您需要复制并执行它来完成设置。

---

遵循以上步骤，您的 `aiapi_web` 服务就可以稳定地在 VPS 上后台运行了。
