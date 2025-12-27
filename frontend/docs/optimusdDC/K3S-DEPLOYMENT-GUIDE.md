# OptimusDDC - K3s Deployment Guide

Complete guide for deploying OptimusDDC on K3s with 3 OptimusDB agents.

## Why K3s?

- **Lightweight**: Perfect for edge, IoT, and development
- **Built-in LoadBalancer**: Klipper LB (no MetalLB needed)
- **Local Storage**: local-path provisioner included
- **Traefik Ingress**: Pre-installed ingress controller
- **Low Resource**: Runs on single node or multi-node clusters

---

## Prerequisites

### 1. Install K3s

**Single Node (Development/Testing):**
```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -

# Verify installation
sudo k3s kubectl get nodes

# Setup kubectl for non-root user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
export KUBECONFIG=~/.kube/config

# Test
kubectl get nodes
```

**Multi-Node Cluster:**
```bash
# On master node
curl -sfL https://get.k3s.io | K3S_TOKEN=mysecrettoken sh -s - server

# Get master IP
MASTER_IP=$(hostname -I | awk '{print $1}')
echo "Master IP: $MASTER_IP"

# On worker nodes
curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=mysecrettoken sh -

# Verify on master
kubectl get nodes
```

### 2. Verify K3s Components

```bash
# Check K3s services
sudo systemctl status k3s

# Verify storage class (local-path)
kubectl get storageclass

# Check Traefik ingress controller
kubectl get pods -n kube-system | grep traefik

# Check Klipper LoadBalancer
kubectl get pods -n kube-system | grep svclb
```

### 3. System Requirements

**Minimum (Single Node):**
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB

**Recommended (Single Node):**
- CPU: 4 cores
- RAM: 8GB
- Disk: 40GB

**Multi-Node:**
- Master: 2 cores, 4GB RAM
- Workers: 2 cores, 4GB RAM each

---

## Deployment

### Step 1: Download Manifest

```bash
# Create working directory
mkdir -p ~/optimusddc-k3s
cd ~/optimusddc-k3s

# Save the manifest (optimusddc-k3s-manifest_26122025.yaml)
# Copy content to this file
```

### Step 2: Review Configuration

```bash
# Check the manifest
cat optimusddc-k3s-manifest_26122025.yaml

# Key K3s-specific settings:
# - storageClassName: local-path (K3s default)
# - LoadBalancer type: Uses Klipper LB
# - Resource limits: Optimized for K3s
# - externalTrafficPolicy: Local (better for single-node)
```

### Step 3: Deploy

```bash
# Apply the manifest
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml

# Verify namespace
kubectl get namespace optimusddc

# Watch pods starting
kubectl get pods -n optimusddc -w
```

Expected output after 2-3 minutes:
```
NAME                                READY   STATUS    RESTARTS   AGE
elasticsearch-xxxxx-xxxxx           1/1     Running   0          2m
optimusdb-0                         1/1     Running   0          2m
optimusdb-1                         1/1     Running   0          2m
optimusdb-2                         1/1     Running   0          2m
catalogsearch-xxxxx-xxxxx           1/1     Running   0          2m
catalogmetadata-xxxxx-xxxxx         1/1     Running   0          2m
catalogfrontend-xxxxx-xxxxx         1/1     Running   0          2m
```

### Step 4: Verify Services

```bash
# Check all services
kubectl get svc -n optimusddc

# Check LoadBalancer IPs (Klipper assigns your node IP)
kubectl get svc -n optimusddc | grep LoadBalancer
```

Expected output:
```
NAME                TYPE           EXTERNAL-IP      PORT(S)
catalogfrontend     LoadBalancer   <NODE-IP>        5015:xxxxx/TCP
optimusdb-0         LoadBalancer   <NODE-IP>        18001:xxxxx/TCP,14001:xxxxx/TCP,15001:xxxxx/TCP
optimusdb-1         LoadBalancer   <NODE-IP>        18002:xxxxx/TCP,14002:xxxxx/TCP,15002:xxxxx/TCP
optimusdb-2         LoadBalancer   <NODE-IP>        18003:xxxxx/TCP,14003:xxxxx/TCP,15003:xxxxx/TCP
```

### Step 5: Check Storage

```bash
# Verify PVCs
kubectl get pvc -n optimusddc

# Expected output:
# NAME                   STATUS   VOLUME   CAPACITY   STORAGE CLASS
# elasticsearch-pvc      Bound    pvc-xxx  10Gi       local-path
# data-optimusdb-0       Bound    pvc-xxx  5Gi        local-path
# data-optimusdb-1       Bound    pvc-xxx  5Gi        local-path
# data-optimusdb-2       Bound    pvc-xxx  5Gi        local-path

# Check physical storage location
sudo ls -la /var/lib/rancher/k3s/storage/
```

---

## Accessing Services

### Option 1: Via LoadBalancer (K3s Klipper)

```bash
# Get your K3s node IP
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "Node IP: $NODE_IP"

# Access services
# Frontend: http://$NODE_IP:5015
# OptimusDB-0: http://$NODE_IP:18001
# OptimusDB-1: http://$NODE_IP:18002
# OptimusDB-2: http://$NODE_IP:18003

# Open frontend in browser
xdg-open http://$NODE_IP:5015  # Linux
open http://$NODE_IP:5015      # macOS
start http://$NODE_IP:5015     # Windows
```

### Option 2: Via Port Forward

```bash
# Forward frontend (if LoadBalancer issues)
kubectl port-forward svc/catalogfrontend 5015:5015 -n optimusddc

# Access at: http://localhost:5015
```

### Option 3: Via Traefik Ingress

Enable Ingress in the manifest (uncomment the Ingress section), then:

```bash
# Add to /etc/hosts
sudo bash -c "echo '$NODE_IP optimusddc.local' >> /etc/hosts"

# Apply updated manifest
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml

# Access at: http://optimusddc.local
```

---

## Testing OptimusDB Cluster

### Test Individual Nodes

```bash
# Test OptimusDB-0
curl http://$NODE_IP:18001/health
curl http://$NODE_IP:18001/cluster/status

# Test OptimusDB-1
curl http://$NODE_IP:18002/health

# Test OptimusDB-2
curl http://$NODE_IP:18003/health
```

### Test Internal Connectivity

```bash
# Exec into metadata pod
kubectl exec -it deployment/catalogmetadata -n optimusddc -- /bin/bash

# Test OptimusDB internal service
curl http://optimusdb-internal:8089/health

# Test peer connectivity
curl http://optimusdb-0.optimusdb-headless:8089/health
curl http://optimusdb-1.optimusdb-headless:8089/health
curl http://optimusdb-2.optimusdb-headless:8089/health

exit
```

### Verify P2P Mesh Network

```bash
# Check if pods can reach each other on P2P port
kubectl exec -it optimusdb-0 -n optimusddc -- nc -zv optimusdb-1.optimusdb-headless 4001
kubectl exec -it optimusdb-0 -n optimusddc -- nc -zv optimusdb-2.optimusdb-headless 4001
```

---

## Monitoring and Logs

### View Logs

```bash
# Stream all logs from a service
kubectl logs -f deployment/catalogfrontend -n optimusddc
kubectl logs -f deployment/catalogmetadata -n optimusddc
kubectl logs -f deployment/catalogsearch -n optimusddc
kubectl logs -f deployment/elasticsearch -n optimusddc

# Stream logs from OptimusDB nodes
kubectl logs -f optimusdb-0 -n optimusddc
kubectl logs -f optimusdb-1 -n optimusddc
kubectl logs -f optimusdb-2 -n optimusddc

# View logs from all OptimusDB pods
kubectl logs -l app=optimusdb -n optimusddc --tail=50
```

### Check Resource Usage

```bash
# Pod resource usage (requires metrics-server)
kubectl top pods -n optimusddc

# Node resource usage
kubectl top nodes

# Storage usage
df -h /var/lib/rancher/k3s/storage/
```

### Describe Pods (for troubleshooting)

```bash
# Get detailed pod information
kubectl describe pod optimusdb-0 -n optimusddc
kubectl describe pod -l app=catalogfrontend -n optimusddc

# Check events
kubectl get events -n optimusddc --sort-by='.lastTimestamp'
```

---

## K3s-Specific Features

### 1. Local Storage Persistence

```bash
# K3s stores volumes at:
sudo ls -la /var/lib/rancher/k3s/storage/

# Backup volumes
sudo tar -czf optimusdb-backup.tar.gz /var/lib/rancher/k3s/storage/pvc-*
```

### 2. Klipper LoadBalancer

```bash
# Check Klipper pods (one per node, per LoadBalancer service)
kubectl get pods -n kube-system | grep svclb

# Klipper creates a DaemonSet for each LoadBalancer service
kubectl get daemonsets -n kube-system | grep svclb
```

### 3. Traefik Dashboard (Optional)

```bash
# Expose Traefik dashboard
kubectl port-forward -n kube-system deployment/traefik 9000:9000

# Access at: http://localhost:9000/dashboard/
```

### 4. Resource Management

```bash
# K3s is lightweight, but you can tune it
sudo vi /etc/systemd/system/k3s.service

# Add memory limits if needed:
# --kubelet-arg="kube-reserved=cpu=500m,memory=500Mi"
# --kubelet-arg="system-reserved=cpu=500m,memory=500Mi"

# Restart K3s
sudo systemctl restart k3s
```

---

## Scaling and Updates

### Scale OptimusDB Cluster

```bash
# Scale to 5 nodes
kubectl scale statefulset optimusdb --replicas=5 -n optimusddc

# Create LoadBalancer services for new nodes
# (Copy optimusdb-3 and optimusdb-4 service definitions)
```

### Update Images

```bash
# Update catalogfrontend to newer version
kubectl set image deployment/catalogfrontend \
  catalogfrontend=amundsendev/amundsen-frontend:4.3.0 \
  -n optimusddc

# Watch rollout
kubectl rollout status deployment/catalogfrontend -n optimusddc

# Rollback if needed
kubectl rollout undo deployment/catalogfrontend -n optimusddc
```

### Update OptimusDB

```bash
# Update StatefulSet to new image
kubectl set image statefulset/optimusdb \
  optimusdb=ghcr.io/georgegeorgakakos/optimusdb:v2.0 \
  -n optimusddc

# Watch rolling update
kubectl get pods -n optimusddc -w
```

---

## Troubleshooting

### Pods Stuck in Pending

```bash
# Check events
kubectl describe pod <pod-name> -n optimusddc

# Common causes:
# 1. Insufficient resources
kubectl describe nodes

# 2. Storage issues
kubectl get pvc -n optimusddc
sudo ls -la /var/lib/rancher/k3s/storage/
```

### LoadBalancer Not Getting External IP

```bash
# Check if Klipper is running
kubectl get pods -n kube-system | grep svclb

# Restart Klipper if needed
kubectl delete pods -n kube-system -l svccontroller.k3s.cattle.io/svcname=catalogfrontend

# Wait for recreation
kubectl get pods -n kube-system -w
```

### OptimusDB Pods Not Communicating

```bash
# Check DNS resolution
kubectl exec -it optimusdb-0 -n optimusddc -- nslookup optimusdb-headless

# Check network connectivity
kubectl exec -it optimusdb-0 -n optimusddc -- ping optimusdb-1.optimusdb-headless

# Check if P2P ports are open
kubectl exec -it optimusdb-0 -n optimusddc -- nc -zv optimusdb-1.optimusdb-headless 4001
```

### Elasticsearch Issues

```bash
# Check if Elasticsearch is healthy
kubectl exec -it deployment/elasticsearch -n optimusddc -- curl http://localhost:9200/_cluster/health

# Increase memory if needed (edit deployment)
kubectl edit deployment elasticsearch -n optimusddc

# Change: ES_JAVA_OPTS: "-Xms1g -Xmx1g"
```

### Storage Full

```bash
# Check disk usage
df -h /var/lib/rancher/k3s/storage/

# Clean up unused volumes
kubectl delete pvc <unused-pvc> -n optimusddc

# Or expand PVC (if storage class supports it)
kubectl edit pvc elasticsearch-pvc -n optimusddc
# Change: storage: 20Gi
```

---

## Backup and Restore

### Backup

```bash
# Backup manifests
kubectl get all,pvc,configmap,secret -n optimusddc -o yaml > optimusddc-backup.yaml

# Backup volumes
sudo tar -czf optimusddc-volumes-backup.tar.gz /var/lib/rancher/k3s/storage/pvc-*

# Backup K3s etcd (entire cluster state)
sudo k3s etcd-snapshot save
sudo ls -la /var/lib/rancher/k3s/server/db/snapshots/
```

### Restore

```bash
# Restore from manifest
kubectl apply -f optimusddc-backup.yaml

# Restore volumes (stop pods first)
kubectl scale statefulset optimusdb --replicas=0 -n optimusddc
kubectl scale deployment --all --replicas=0 -n optimusddc

# Extract volumes
sudo tar -xzf optimusddc-volumes-backup.tar.gz -C /

# Restart pods
kubectl scale statefulset optimusdb --replicas=3 -n optimusddc
kubectl scale deployment --all --replicas=1 -n optimusddc
```

---

## Cleanup

### Remove OptimusDDC

```bash
# Delete all resources
kubectl delete -f optimusddc-k3s-manifest_26122025.yaml

# Or delete namespace (removes everything)
kubectl delete namespace optimusddc

# Clean up volumes (if not auto-deleted)
kubectl delete pv --all

# Remove physical storage
sudo rm -rf /var/lib/rancher/k3s/storage/pvc-*
```

### Uninstall K3s

```bash
# Stop and remove K3s
/usr/local/bin/k3s-uninstall.sh

# Clean up completely
sudo rm -rf /var/lib/rancher
sudo rm -rf /etc/rancher
```

---

## Production Hardening

### 1. Enable TLS

```bash
# Generate certificates
kubectl create secret tls optimusddc-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n optimusddc

# Update Ingress to use TLS
# (Uncomment and modify Ingress section in manifest)
```

### 2. Resource Limits

```bash
# Set resource quotas
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: optimusddc-quota
  namespace: optimusddc
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
EOF
```

### 3. Network Policies

```bash
# Enable network policies (uncomment in manifest)
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml

# Verify
kubectl get networkpolicies -n optimusddc
```

### 4. Pod Security

```bash
# Enable Pod Security Standards
kubectl label namespace optimusddc \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

---

## Performance Tuning

### For Small Environments (1-2 nodes)

```yaml
# In manifest, adjust:
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### For Large Environments (5+ nodes)

```yaml
# Increase resources:
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

# Increase replicas:
spec:
  replicas: 2  # For stateless services
```

---

## Useful Commands Reference

```bash
# Quick Status Check
kubectl get all -n optimusddc

# Watch Pods
kubectl get pods -n optimusddc -w

# Get Service IPs
kubectl get svc -n optimusddc

# Port Forward
kubectl port-forward svc/catalogfrontend 5015:5015 -n optimusddc

# Exec into Pod
kubectl exec -it optimusdb-0 -n optimusddc -- /bin/sh

# View Logs
kubectl logs -f optimusdb-0 -n optimusddc

# Restart Deployment
kubectl rollout restart deployment/catalogfrontend -n optimusddc

# Describe Resource
kubectl describe pod optimusdb-0 -n optimusddc

# Delete All
kubectl delete namespace optimusddc
```

---

## Next Steps

1. **Access Frontend**: http://$NODE_IP:5015
2. **Load Sample Data** into OptimusDB
3. **Configure Search** indices in Elasticsearch
4. **Set Up Monitoring** with Prometheus/Grafana
5. **Enable TLS** for production
6. **Create Backups** regularly
7. **Test Failover** scenarios

**Success!** Your OptimusDDC cluster is now running on K3s! 🚀
