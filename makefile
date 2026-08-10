APP_NAME := pixelsetu-master
BUILD_DIR := dist
OUTPUT_DIR := releases
DEPLOY_DIR := deploy
APP_PORT := 3000

REMOTE_HOST := pixelsetu-deploy
REMOTE_PATH := /opt/pixelsetu-master
ENV_FILE := .env

ARCHIVE := $(OUTPUT_DIR)/$(APP_NAME).tar.gz
ENTRYPOINT := $(DEPLOY_DIR)/dist/main.js
NGINX_SITES_AVAILABLE := /etc/nginx/sites-available
NGINX_SITES_ENABLED := /etc/nginx/sites-enabled
NGINX_SITE := $(NGINX_SITES_AVAILABLE)/$(APP_NAME)

.PHONY: build package run deploy deploy-local restart stop logs clean nginx-install nginx-configure nginx-setup

# ----------------------------------------
# Build
# ----------------------------------------

build:
	npm run build


# ----------------------------------------
# Package build output
# ----------------------------------------

package: build
	mkdir -p $(OUTPUT_DIR)
	tar -czf $(ARCHIVE) $(BUILD_DIR) package.json package-lock.json
	@echo ""
	@echo "Build packaged:"
	@echo "  $(ARCHIVE)"
	@echo ""


# ----------------------------------------
# Extract and start application with PM2 (local)
# ----------------------------------------

run:
	@echo "Starting $(APP_NAME) locally..."
	@test -f $(ENV_FILE) || (echo "Missing $(ENV_FILE)" && exit 1)
	rm -rf $(DEPLOY_DIR)
	mkdir -p $(DEPLOY_DIR)

	tar -xzf $(ARCHIVE) -C $(DEPLOY_DIR)

	cd $(DEPLOY_DIR) && npm ci --omit=dev && \
	set -a && . ../$(ENV_FILE) && set +a && \
	export NODE_ENV=$${NODE_ENV:-production} && \
	pm2 delete $(APP_NAME) 2>/dev/null || true && \
	pm2 start dist/main.js --name $(APP_NAME) --cwd $(DEPLOY_DIR) --update-env && \
	pm2 save

	@echo ""
	@echo "$(APP_NAME) is running locally."
	@echo ""


# ----------------------------------------
# Deploy to VPS from local machine
# ----------------------------------------

deploy: package
	@APP_NAME=$(APP_NAME) REMOTE_HOST=$(REMOTE_HOST) REMOTE_PATH=$(REMOTE_PATH) ENV_FILE=$(ENV_FILE) \
		./scripts/deploy-remote.sh $(ARCHIVE)


# ----------------------------------------
# Build + Package + Run (local)
# ----------------------------------------

deploy-local: package run
	@echo ""
	@echo "Local deployment completed successfully."
	@echo ""


# ----------------------------------------
# Restart PM2 application
# ----------------------------------------

restart:
	@test -f $(ENV_FILE) || (echo "Missing $(ENV_FILE)" && exit 1)
	set -a && . ./$(ENV_FILE) && set +a && \
	export NODE_ENV=$${NODE_ENV:-production} && \
	pm2 restart $(APP_NAME) --update-env


# ----------------------------------------
# Stop PM2 application
# ----------------------------------------

stop:
	pm2 stop $(APP_NAME)


# ----------------------------------------
# View application logs
# ----------------------------------------

logs:
	pm2 logs $(APP_NAME)


# ----------------------------------------
# Clean build/deployment files
# ----------------------------------------

clean:
	rm -rf $(BUILD_DIR)
	rm -rf $(OUTPUT_DIR)
	rm -rf $(DEPLOY_DIR)

	@echo "Cleaned build, releases and deployment directories."


# ----------------------------------------
# Install and configure nginx (Ubuntu)
# ----------------------------------------

nginx-install:
	@echo "Installing nginx..."
	sudo apt-get update
	sudo apt-get install -y nginx
	@echo ""
	@echo "nginx installed."

nginx-configure:
	@echo "Configuring nginx to proxy to port $(APP_PORT)..."
	sudo tee $(NGINX_SITE) > /dev/null <<EOF
	server {
	    listen 80 default_server;
	    listen [::]:80 default_server;
	    server_name _;

	    location / {
	        proxy_pass http://127.0.0.1:$(APP_PORT);
	        proxy_http_version 1.1;
	        proxy_set_header Upgrade $$http_upgrade;
	        proxy_set_header Connection 'upgrade';
	        proxy_set_header Host $$host;
	        proxy_set_header X-Real-IP $$remote_addr;
	        proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
	        proxy_set_header X-Forwarded-Proto $$scheme;
	        proxy_cache_bypass $$http_upgrade;
	    }
	}
	EOF
	sudo ln -sf $(NGINX_SITE) $(NGINX_SITES_ENABLED)/$(APP_NAME)
	sudo rm -f $(NGINX_SITES_ENABLED)/default
	sudo nginx -t
	sudo systemctl enable nginx
	sudo systemctl reload nginx
	@echo ""
	@echo "nginx configured: port 80 -> localhost:$(APP_PORT)"
	@echo ""

nginx-setup: nginx-install nginx-configure
	@echo ""
	@echo "nginx setup completed."
	@echo ""
