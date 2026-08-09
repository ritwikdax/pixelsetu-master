APP_NAME := pixelsetu-master
BUILD_DIR := dist
OUTPUT_DIR := releases
DEPLOY_DIR := deploy
APP_PORT := 3000

ARCHIVE := $(OUTPUT_DIR)/$(APP_NAME).tar.gz
ENTRYPOINT := $(DEPLOY_DIR)/$(BUILD_DIR)/src/main.js
NGINX_SITES_AVAILABLE := /etc/nginx/sites-available
NGINX_SITES_ENABLED := /etc/nginx/sites-enabled
NGINX_SITE := $(NGINX_SITES_AVAILABLE)/$(APP_NAME)

.PHONY: build package run deploy restart stop logs clean nginx-install nginx-configure nginx-setup

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
	tar -czf $(ARCHIVE) $(BUILD_DIR)
	@echo ""
	@echo "Build packaged:"
	@echo "  $(ARCHIVE)"
	@echo ""


# ----------------------------------------
# Extract and start application with PM2
# ----------------------------------------

run:
	@echo "Deploying $(APP_NAME)..."
	rm -rf $(DEPLOY_DIR)
	mkdir -p $(DEPLOY_DIR)

	tar -xzf $(ARCHIVE) -C $(DEPLOY_DIR)

	pm2 delete $(APP_NAME) 2>/dev/null || true
	pm2 start $(ENTRYPOINT) --name $(APP_NAME)

	pm2 save

	@echo ""
	@echo "$(APP_NAME) is running."
	@echo ""


# ----------------------------------------
# Build + Package + Run
# ----------------------------------------

deploy: package run
	@echo ""
	@echo "Deployment completed successfully."
	@echo ""


# ----------------------------------------
# Restart PM2 application
# ----------------------------------------

restart:
	pm2 restart $(APP_NAME)


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