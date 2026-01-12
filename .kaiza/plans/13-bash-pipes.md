---
status: APPROVED
title: "Bash Full-Stack System Administration Toolkit"
description: "Complete system administration suite with process pipelines, stream processing, and infrastructure automation"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/bash/**"
---

# Bash Full-Stack Implementation Plan

## Overview
Build comprehensive system administration utilities using Bash with advanced piping, process substitution, stream manipulation, and infrastructure automation for monitoring, logging, and deployment.

## Pipe-Based Data Processing

### 1. Stream Processing Pipelines
```bash
#!/bin/bash

# Log aggregation pipeline
function aggregate_logs() {
    local log_dir="${1:-.}"
    
    find "$log_dir" -name "*.log" -type f |
        xargs tail -f |
        grep -E "ERROR|WARN" |
        awk '{print $1, $NF}' |
        sort |
        uniq -c |
        sort -rn |
        head -20
}

# System monitoring pipeline
function monitor_system() {
    while true; do
        {
            ps aux |
            awk '$3 > 5.0 {print $2, $3, $11}' |
            sort -k2 -rn |
            head -5
        } | while read pid cpu cmd; do
            echo "PID: $pid, CPU: ${cpu}%, CMD: $cmd" >&2
        done
        
        sleep 5
    done
}

# Network traffic analysis
function analyze_traffic() {
    tcpdump -l |
        grep -oP 'IP \K[^ ]+ > [^ ]+' |
        awk -F'>' '{print $1}' |
        sort |
        uniq -c |
        sort -rn |
        head -10
}
```

### 2. Process Substitution
```bash
#!/bin/bash

# Compare two command outputs
function compare_states() {
    diff <(curl -s "$HOST1/api/status" | jq '.') \
         <(curl -s "$HOST2/api/status" | jq '.')
}

# Simultaneous log monitoring
function monitor_multiple_logs() {
    paste <(tail -f /var/log/app1.log | sed 's/^/[APP1] /') \
          <(tail -f /var/log/app2.log | sed 's/^/[APP2] /')
}

# Parallel data processing
function process_in_parallel() {
    local file1="$1" file2="$2"
    
    comm -23 <(sort "$file1") <(sort "$file2")
}
```

## System Monitoring Scripts

### 1. Resource Monitoring
```bash
#!/bin/bash

function check_disk_usage() {
    local threshold="${1:-80}"
    
    df -h |
    grep -vE '^Filesystem|tmpfs|cdrom' |
    awk -v threshold="$threshold" '
        {
            usage = substr($5, 1, length($5)-1)
            if (usage > threshold) {
                print "WARNING: " $6 " is " usage "% full"
            }
        }
    '
}

function monitor_memory() {
    local alert_threshold="${1:-90}"
    
    while true; do
        free |
        awk -v threshold="$alert_threshold" '
            NR==2 {
                usage = ($3 / $2) * 100
                if (usage > threshold) {
                    print "ALERT: Memory usage " usage "%"
                }
            }
        '
        sleep 10
    done
}

function process_health_check() {
    local process_name="$1"
    local restart_cmd="$2"
    
    if ! pgrep -x "$process_name" > /dev/null; then
        echo "Process $process_name not running. Restarting..."
        eval "$restart_cmd"
    fi
}
```

## String and Variable Manipulation

### 1. Advanced String Operations
```bash
#!/bin/bash

# String manipulation
function process_strings() {
    local str="Hello World 123"
    
    # Substring extraction
    echo "${str:0:5}"  # "Hello"
    
    # Pattern substitution
    echo "${str/World/Universe}"  # "Hello Universe 123"
    
    # Parameter expansion
    echo "${str^^}"  # "HELLO WORLD 123"
    echo "${str,,}"  # "hello world 123"
    
    # Remove prefix/suffix
    echo "${str#Hello }"  # "World 123"
    echo "${str% 123}"   # "Hello World"
}

# Array operations
function array_processing() {
    local arr=("apple" "banana" "cherry" "date")
    
    # Array iteration
    for fruit in "${arr[@]}"; do
        echo "Fruit: $fruit"
    done
    
    # Array slicing
    echo "${arr[@]:1:2}"  # "banana cherry"
    
    # Array length
    echo "Length: ${#arr[@]}"
    
    # String in array
    if [[ " ${arr[@]} " =~ " banana " ]]; then
        echo "Found banana"
    fi
}

# Regex and pattern matching
function pattern_matching() {
    local email="user@example.com"
    local regex="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    
    if [[ $email =~ $regex ]]; then
        echo "Valid email"
    fi
    
    local text="Error: Connection timeout at 2024-01-12"
    [[ $text =~ Error:\ ([^ ]+)\ ([^ ]+) ]] && echo "${BASH_REMATCH[1]} - ${BASH_REMATCH[2]}"
}
```

## Infrastructure Automation

### 1. Deployment Pipeline
```bash
#!/bin/bash

set -euo pipefail

# Configuration
readonly APP_NAME="myapp"
readonly APP_DIR="/opt/myapp"
readonly BACKUP_DIR="/backups"
readonly LOG_FILE="/var/log/deployment.log"

# Logging
function log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling
trap 'log "Error on line $LINENO"; exit 1' ERR

function backup_current() {
    log "Backing up current version..."
    local backup_name="$BACKUP_DIR/$APP_NAME-$(date +%s).tar.gz"
    tar -czf "$backup_name" -C "$APP_DIR" . || {
        log "Backup failed"
        return 1
    }
}

function deploy_new_version() {
    local version="$1"
    local download_url="https://releases.example.com/$version.tar.gz"
    
    log "Deploying version $version"
    
    cd "$APP_DIR" || exit 1
    
    wget -q "$download_url" -O app-new.tar.gz || {
        log "Download failed"
        return 1
    }
    
    tar -xzf app-new.tar.gz || {
        log "Extract failed"
        return 1
    }
    
    rm app-new.tar.gz
}

function verify_deployment() {
    log "Verifying deployment..."
    
    if ! systemctl is-active --quiet "$APP_NAME"; then
        log "Service not running"
        return 1
    fi
    
    local health_check="curl -s http://localhost:8080/health"
    if ! eval "$health_check" | jq -e '.status == "ok"' > /dev/null; then
        log "Health check failed"
        return 1
    }
    
    log "Deployment verified"
}

function rollback() {
    log "Rolling back..."
    local latest_backup=$(ls -t "$BACKUP_DIR"/$APP_NAME-*.tar.gz | head -1)
    
    cd "$APP_DIR" || exit 1
    rm -rf *
    tar -xzf "$latest_backup"
    
    systemctl restart "$APP_NAME"
    log "Rollback complete"
}

# Main deployment flow
main() {
    local version="${1:-latest}"
    
    log "Starting deployment of version $version"
    
    backup_current || { rollback; exit 1; }
    deploy_new_version "$version" || { rollback; exit 1; }
    verify_deployment || { rollback; exit 1; }
    
    log "Deployment successful"
}

main "$@"
```

### 2. System Configuration
```bash
#!/bin/bash

# Configuration management
function apply_configs() {
    local config_dir="$1"
    
    for config in "$config_dir"/*.conf; do
        [ -f "$config" ] || continue
        
        local service_name=$(basename "$config" .conf)
        
        log "Applying config for $service_name"
        cp "$config" "/etc/$service_name.conf"
        
        systemctl reload "$service_name" || log "Warning: Failed to reload $service_name"
    done
}

# Service management
function ensure_service_running() {
    local service="$1"
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if systemctl is-active --quiet "$service"; then
            return 0
        fi
        
        log "Starting $service (attempt $((retry_count + 1))/$max_retries)"
        systemctl start "$service"
        
        ((retry_count++))
        sleep 2
    done
    
    log "Error: $service failed to start"
    return 1
}
```

## Log Processing

### 1. Log Aggregation
```bash
#!/bin/bash

function analyze_log_patterns() {
    local log_file="$1"
    
    # Extract unique error patterns
    grep -i "error" "$log_file" |
    awk -F: '{print $NF}' |
    sort |
    uniq -c |
    sort -rn |
    head -10
}

function generate_hourly_report() {
    local log_file="$1"
    local output_file="report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== Hourly Log Report ==="
        echo "Generated: $(date)"
        echo
        
        echo "Error count: $(grep -c -i "error" "$log_file" || echo "0")"
        echo "Warning count: $(grep -c -i "warn" "$log_file" || echo "0")"
        echo "Info count: $(grep -c -i "info" "$log_file" || echo "0")"
        echo
        
        echo "=== Top Errors ==="
        grep -i "error" "$log_file" |
        awk -F: '{print $NF}' |
        sort |
        uniq -c |
        sort -rn |
        head -5
    } | tee "$output_file"
}
```

## Cronjob Automation

### 1. Scheduled Tasks
```bash
#!/bin/bash

# Add to crontab:
# 0 2 * * * /usr/local/bin/backup.sh
# */5 * * * * /usr/local/bin/health-check.sh
# 0 0 * * 0 /usr/local/bin/cleanup.sh

function backup_script() {
    local backup_dir="/backups"
    local retention_days=30
    
    mkdir -p "$backup_dir"
    
    # Create backup
    tar -czf "$backup_dir/backup-$(date +%Y%m%d-%H%M%S).tar.gz" \
        /data /home /opt
    
    # Clean old backups
    find "$backup_dir" -name "backup-*.tar.gz" -mtime +"$retention_days" -delete
}

function health_check() {
    local services=("nginx" "postgresql" "redis")
    
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service"; then
            echo "Service $service is down" | mail -s "Alert" admin@example.com
            systemctl start "$service"
        fi
    done
}
```

## Deliverables

1. Log aggregation and analysis scripts
2. System monitoring utilities
3. Process health check system
4. Deployment automation pipeline
5. Configuration management
6. Backup and recovery scripts
7. Performance analysis tools
8. Cron-based automation
9. Error notification system
10. Infrastructure provisioning
11. Comprehensive documentation
12. Testing and validation scripts
