# XQ Test Infrastructure CLI - Change Log

## Major CLI Simplification & Log Capture Implementation

### Summary
Completed comprehensive refactoring of the CLI interface to simplify usage and add automatic log capture functionality. All 20 planned tasks have been successfully implemented.

### **Core CLI Changes**

#### **Simplified Command Interface**
- **Before**: `xq-infra generate -f spec.yaml -o compose.yml` → `xq-infra up -f compose.yml -d` → `xq-infra down -f compose.yml`
- **After**: `xq-infra generate -f spec.yaml` → `xq-infra up` → `xq-infra down`

#### **Key Improvements**
1. **Fixed Output File**: All operations now use `xq-compose.yml` in current directory
2. **Default Detached Mode**: Containers always run in background automatically
3. **Implicit File Usage**: Up/down commands automatically use `xq-compose.yml`
4. **Automatic Log Capture**: All container logs written to `xq-infra.log`

### **New Features**

#### **🔄 Automatic Log Streaming**
- **Real-time log capture** from all running containers
- **Single log file** (`xq-infra.log`) contains all service outputs
- **Timestamped entries** with service identification
- **Background operation** continues until containers are stopped
- **Graceful cleanup** when stopping services

#### **📁 File Management**
- **Predictable file locations**: Always `xq-compose.yml` and `xq-infra.log`
- **Auto-cleanup**: Generated files cleaned up appropriately
- **Git integration**: Added to `.gitignore` to avoid accidental commits

### **Updated Commands**

#### **Generate Command**
```bash
# Before
xq-infra generate -f spec.yaml -o output.yml --no-gateway --keep-file

# After
xq-infra generate -f spec.yaml --no-gateway --keep-file
# Always outputs to: xq-compose.yml
```

#### **Up Command**
```bash
# Before
xq-infra up -f compose.yml -d --pull

# After
xq-infra up --pull
# Uses: xq-compose.yml (detached mode default)
# Creates: xq-infra.log (automatic logging)
```

#### **Down Command**
```bash
# Before
xq-infra down -f compose.yml

# After
xq-infra down
# Uses: xq-compose.yml
# Stops: log streaming automatically
```

### **Technical Implementation**

#### **Service Architecture** (Following ES6 Class Patterns)
- **LogStreamer Service**: New singleton class for background log capture
- **Enhanced ComposeGenerator**: Fixed output path to `xq-compose.yml`
- **Updated ComposeInvoker**: Default detached mode with orphan cleanup
- **CLI Integration**: Seamless log streaming in up/down workflow

### **Breaking Changes**

#### **⚠️ CLI Interface Changes**
1. **Output path option removed**: `-o, --out` flag no longer available
2. **File argument removed**: Up/down commands no longer accept `-f, --file`
3. **Detached flag removed**: `-d, --detached` no longer needed (default behavior)
4. **Fixed file names**: Always uses `xq-compose.yml` and `xq-infra.log`

#### **Migration Guide**
```bash
# Old workflow
xq-infra generate -f app.yaml -o my-compose.yml
xq-infra up -f my-compose.yml -d
# Check logs manually with: docker compose -f my-compose.yml logs
xq-infra down -f my-compose.yml

# New workflow
xq-infra generate -f app.yaml
xq-infra up
# Logs automatically captured in: xq-infra.log
xq-infra down
```

### **File Structure Changes**

#### **New Files**
- `src/services/logStreamer.js` - Background log capture service
- `xq-compose.yml` - Generated compose file (git-ignored)
- `xq-infra.log` - Captured container logs (git-ignored)

#### **Updated Files**
- `src/cli/index.js` - Simplified command definitions
- `src/services/composeGenerator.js` - Fixed output path
- `src/services/composeInvoker.js` - Default detached mode
- `.gitignore` - Added generated files
- All test files - Updated for new behavior

### **Benefits**

#### **User Experience**
- **Fewer arguments** to remember and type
- **Predictable file locations** for easier debugging
- **Automatic logging** eliminates manual log checking
- **Consistent workflow** across all environments

#### **Developer Experience**
- **Simplified CI/CD** integration with fewer parameters
- **Better debugging** with centralized log file
- **Reduced errors** from incorrect file paths
- **Faster iteration** with streamlined commands

---

## Additional Update: On-Demand Log Viewing

### **Logging Strategy Revision**

After implementation, the automatic real-time log capture was causing the CLI to hang due to complex background process management. We've revised the approach to a simpler, more reliable on-demand logging system.

### **New Logs Command**

#### **Command Added**
```bash
xq-infra logs [service] [options]

Options:
  -f, --follow              Follow log output in real-time
  -t, --tail <lines>        Number of lines to show (default: 100)
  --timestamps              Show timestamps
  [service]                 Optional: specific service name
```

#### **Usage Examples**
```bash
# View last 100 lines of all service logs
xq-infra logs

# Follow logs in real-time (similar to tail -f)
xq-infra logs -f

# View logs for specific service
xq-infra logs frontend

# View last 50 lines with timestamps
xq-infra logs --tail 50 --timestamps

# Follow specific service logs
xq-infra logs backend -f
```

### **Benefits of New Approach**

#### **Reliability**
- **No hanging CLI**: Commands return immediately
- **No background processes**: Logs only when requested
- **Standard Docker behavior**: Uses native `docker compose logs`
- **User controlled**: View logs only when needed

#### **Flexibility**
- **Service-specific logs**: View individual service logs
- **Customizable output**: Control tail length and timestamps
- **Real-time when needed**: Use `-f` for live log following
- **Familiar interface**: Similar to standard Docker commands

### **Updated Workflow**

#### **Before (v0.0.1):**
```bash
xq-infra generate -f spec.yaml -o compose.yml
xq-infra up -f compose.yml -d
docker compose -f compose.yml logs  # Manual Docker command
xq-infra down -f compose.yml
```

#### **After (v0.0.2):**
```bash
xq-infra generate -f spec.yaml      # → xq-compose.yml
xq-infra up                         # → Start services (returns immediately)
xq-infra logs                       # → View logs when needed
xq-infra logs -f                    # → Follow logs in real-time
xq-infra down                       # → Stop services
```

### **File Changes Reverted**
- **Removed**: `src/services/logStreamer.js` - Complex background logging
- **Removed**: `xq-infra.log` from .gitignore - No longer auto-generated
- **Simplified**: CLI commands no longer manage background processes

### **Technical Implementation**
- **Logs command**: Direct integration with `docker compose logs`
- **Option mapping**: CLI flags map to Docker Compose arguments
- **Error handling**: Proper error codes and messages
- **Process management**: Uses existing `execCommand` infrastructure

---

## Implementation Completion Status: ✅ 100%

All tasks completed successfully with simplified CLI interface and practical on-demand log viewing functionality.