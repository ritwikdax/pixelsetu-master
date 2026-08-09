APP_NAME := pixelsetu-master
BUILD_DIR := dist
OUTPUT_DIR := releases
DEPLOY_DIR := deploy

ARCHIVE := $(OUTPUT_DIR)/$(APP_NAME).tar.gz
ENTRYPOINT := $(DEPLOY_DIR)/$(BUILD_DIR)/src/main.js

.PHONY: build package run deploy restart stop logs clean

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