# OptimusDDC K3s Quick Reference

## One-Liner Deploy

```bash
# Deploy everything
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml && kubectl get pods -n optimusddc -w
```

---

## Essential Commands

### Status Checks

```bash
# Quick overview
kubectl get all -n optimusddc

# Pod status
kubectl get pods -n optimusddc

# Service IPs
kubectl get svc -n optimusddc

# Storage status
kubectl get pvc -n optimusddc

# Node IP
kubectl get nodes -o wide
```

### Access Services

```bash
# Get node IP
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

# Frontend
echo "Frontend: http://$NODE_IP:5015"

# OptimusDB nodes
echo "OptimusDB-0: http://$NODE_IP:18001"
echo "OptimusDB-1: http://$NODE_IP:18002"
echo "OptimusDB-2: http://$NODE_IP:18003"

# Or port-forward
kubectl port-forward svc/catalogfrontend 5015:5015 -n optimusddc
```

### Logs

```bash
# Stream logs
kubectl logs -f deployment/catalogfrontend -n optimusddc
kubectl logs -f deployment/catalogmetadata -n optimusddc
kubectl logs -f deployment/catalogsearch -n optimusddc
kubectl logs -f deployment/elasticsearch -n optimusddc
kubectl logs -f optimusdb-0 -n optimusddc
kubectl logs -f optimusdb-1 -n optimusddc
kubectl logs -f optimusdb-2 -n optimusddc

# All OptimusDB logs
kubectl logs -l app=optimusdb -n optimusddc --tail=50

# Last 100 lines
kubectl logs --tail=100 optimusdb-0 -n optimusddc

# Previous pod instance
kubectl logs -p optimusdb-0 -n optimusddc
```

### Debugging

```bash
# Describe pod
kubectl describe pod optimusdb-0 -n optimusddc

# Get events
kubectl get events -n optimusddc --sort-by='.lastTimestamp'

# Shell into pod
kubectl exec -it optimusdb-0 -n optimusddc -- /bin/sh
kubectl exec -it deployment/catalogfrontend -n optimusddc -- /bin/bash

# Test connectivity
kubectl exec -it optimusdb-0 -n optimusddc -- ping optimusdb-1.optimusdb-headless
kubectl exec -it optimusdb-0 -n optimusddc -- nc -zv optimusdb-1.optimusdb-headless 4001

# Check DNS
kubectl exec -it optimusdb-0 -n optimusddc -- nslookup optimusdb-headless
```

### Restart & Update

```bash
# Restart deployment
kubectl rollout restart deployment/catalogfrontend -n optimusddc
kubectl rollout restart deployment/catalogmetadata -n optimusddc

# Delete pod to force restart
kubectl delete pod catalogfrontend-xxxxx-xxxxx -n optimusddc
kubectl delete pod optimusdb-0 -n optimusddc

# Update image
kubectl set image deployment/catalogfrontend \
  catalogfrontend=amundsendev/amundsen-frontend:4.3.0 \
  -n optimusddc

# Watch rollout
kubectl rollout status deployment/catalogfrontend -n optimusddc

# Rollback
kubectl rollout undo deployment/catalogfrontend -n optimusddc
```

### Scale

```bash
# Scale stateless services
kubectl scale deployment catalogfrontend --replicas=2 -n optimusddc

# Scale OptimusDB (requires additional LoadBalancer services)
kubectl scale statefulset optimusdb --replicas=5 -n optimusddc
```

### Cleanup

```bash
# Delete everything
kubectl delete namespace optimusddc

# Or delete specific resources
kubectl delete -f optimusddc-k3s-manifest_26122025.yaml

# Force delete stuck pods
kubectl delete pod optimusdb-0 --force --grace-period=0 -n optimusddc
```

---

## K3s-Specific Commands

### K3s Service

```bash
# Check K3s status
sudo systemctl status k3s

# Restart K3s
sudo systemctl restart k3s

# Stop K3s
sudo systemctl stop k3s

# View K3s logs
sudo journalctl -u k3s -f
```

### Storage

```bash
# Check local-path storage
kubectl get storageclass

# Physical location of volumes
sudo ls -la /var/lib/rancher/k3s/storage/

# Find specific PVC location
PVC_NAME=$(kubectl get pvc data-optimusdb-0 -n optimusddc -o jsonpath='{.spec.volumeName}')
sudo ls -la /var/lib/rancher/k3s/storage/$PVC_NAME/
```

### Klipper LoadBalancer

```bash
# Check Klipper pods
kubectl get pods -n kube-system | grep svclb

# Check DaemonSets created by Klipper
kubectl get daemonsets -n kube-system | grep svclb

# Restart Klipper for a service
kubectl delete pods -n kube-system -l svccontroller.k3s.cattle.io/svcname=catalogfrontend
```

### Traefik Ingress

```bash
# Check Traefik status
kubectl get pods -n kube-system | grep traefik

# Traefik dashboard
kubectl port-forward -n kube-system deployment/traefik 9000:9000

# View Ingress resources
kubectl get ingress -n optimusddc
```

### Backup & Restore

```bash
# Backup etcd snapshot
sudo k3s etcd-snapshot save

# List snapshots
sudo ls -la /var/lib/rancher/k3s/server/db/snapshots/

# Restore from snapshot
sudo k3s server --cluster-reset --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/snapshot-name

# Backup volumes
sudo tar -czf optimusddc-backup.tar.gz /var/lib/rancher/k3s/storage/pvc-*

# Backup manifests
kubectl get all,pvc,configmap -n optimusddc -o yaml > optimusddc-backup.yaml
```

---

## Testing Endpoints

### Health Checks

```bash
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

# Elasticsearch
curl http://$NODE_IP:9200/_cluster/health

# OptimusDB health
curl http://$NODE_IP:18001/health
curl http://$NODE_IP:18002/health
curl http://$NODE_IP:18003/health

# OptimusDB cluster status
curl http://$NODE_IP:18001/cluster/status

# Catalog services (from inside cluster)
kubectl exec -it deployment/catalogfrontend -n optimusddc -- curl http://catalogmetadata:5014/healthcheck
kubectl exec -it deployment/catalogfrontend -n optimusddc -- curl http://catalogsearch:5013/healthcheck
```

### Performance Testing

```bash
# Load test OptimusDB
for i in {1..100}; do
  curl -s http://$NODE_IP:18001/health > /dev/null
  echo "Request $i completed"
done

# Monitor resources during test
watch kubectl top pods -n optimusddc
```

---

## Monitoring

### Resource Usage

```bash
# Pod resources (requires metrics-server)
kubectl top pods -n optimusddc
kubectl top pods -n optimusddc --sort-by=memory
kubectl top pods -n optimusddc --sort-by=cpu

# Node resources
kubectl top nodes

# Describe resource limits
kubectl describe pod optimusdb-0 -n optimusddc | grep -A 5 "Limits"
```

### Watch Mode

```bash
# Watch pods
kubectl get pods -n optimusddc -w

# Watch events
kubectl get events -n optimusddc -w

# Watch services
kubectl get svc -n optimusddc -w

# Watch with auto-refresh
watch -n 2 kubectl get pods -n optimusddc
```

---

## Troubleshooting

### Common Issues

```bash
# Pods not starting - check events
kubectl describe pod <pod-name> -n optimusddc
kubectl get events -n optimusddc --sort-by='.lastTimestamp' | tail -20

# ImagePullBackOff
kubectl describe pod <pod-name> -n optimusddc | grep -A 10 "Events"

# CrashLoopBackOff
kubectl logs --previous <pod-name> -n optimusddc

# Pending PVC
kubectl describe pvc <pvc-name> -n optimusddc
sudo ls -la /var/lib/rancher/k3s/storage/

# LoadBalancer pending
kubectl get pods -n kube-system | grep svclb
kubectl describe svc catalogfrontend -n optimusddc

# DNS not resolving
kubectl exec -it optimusdb-0 -n optimusddc -- nslookup kubernetes.default
kubectl exec -it optimusdb-0 -n optimusddc -- cat /etc/resolv.conf
```

### Reset/Recovery

```bash
# Delete and recreate namespace
kubectl delete namespace optimusddc
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml

# Force delete stuck namespace
kubectl get namespace optimusddc -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/optimusddc/finalize" -f -

# Restart all pods
kubectl delete pods --all -n optimusddc

# Clear failed pods
kubectl delete pods --field-selector status.phase=Failed -n optimusddc
```

---

## Configuration Changes

### Edit Resources

```bash
# Edit deployment
kubectl edit deployment catalogfrontend -n optimusddc

# Edit statefulset
kubectl edit statefulset optimusdb -n optimusddc

# Edit service
kubectl edit svc catalogfrontend -n optimusddc

# Edit ConfigMap
kubectl edit configmap optimusdb-config -n optimusddc
```

### Apply Changes

```bash
# Apply modified manifest
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml

# Patch specific field
kubectl patch deployment catalogfrontend -n optimusddc \
  -p '{"spec":{"replicas":2}}'

# Update environment variable
kubectl set env deployment/catalogmetadata \
  OPTIMUSDB_API_URL=http://optimusdb-internal:8089 \
  -n optimusddc
```

---

## Automation Scripts

### Deploy Script

```bash
# Use the provided deployment script
chmod +x deploy-k3s.sh
./deploy-k3s.sh
```

### Custom Script Example

```bash
#!/bin/bash
# Quick status check
kubectl get pods -n optimusddc
echo "---"
kubectl get svc -n optimusddc
echo "---"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "Frontend: http://$NODE_IP:5015"
echo "OptimusDB: http://$NODE_IP:18001"
```

---

## URLs at a Glance

```bash
# Get all service URLs
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

cat <<EOF
=== OptimusDDC Access URLs ===
Frontend:     http://$NODE_IP:5015
OptimusDB-0:  http://$NODE_IP:18001
OptimusDB-1:  http://$NODE_IP:18002
OptimusDB-2:  http://$NODE_IP:18003
=============================
EOF
```

---

## Cheat Sheet for Copy-Paste

```bash
# Deploy
kubectl apply -f optimusddc-k3s-manifest_26122025.yaml

# Watch status
kubectl get pods -n optimusddc -w

# Get URLs
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}') && echo "http://$NODE_IP:5015"

# View logs
kubectl logs -f optimusdb-0 -n optimusddc

# Shell access
kubectl exec -it optimusdb-0 -n optimusddc -- /bin/sh

# Port forward
kubectl port-forward svc/catalogfrontend 5015:5015 -n optimusddc

# Delete all
kubectl delete namespace optimusddc
```
