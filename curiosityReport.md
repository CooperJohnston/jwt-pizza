# Kubernetes Overview

## What Is Kubernetes?

**Kubernetes**, also known as **K8s**, is an open-source system used to deploy, scale, and maintain applications packaged in containers. It manages a group of machines as a cluster, with each machine playing a specific role in keeping applications running reliably.

Kubernetes enables multi-machine operation by:

- Clustering machines together into one unified system  
- Adding a shared networking layer across nodes  
- Using a scheduler to intelligently place containers  
- Running kubelet agents on each node to manage workloads  
- Maintaining “desired state” automatically (self-healing)

In short, Kubernetes distributes and controls containers across multiple systems automatically and reliably.

---

## Why Is Kubernetes Important?

Kubernetes solves several major challenges that come with managing modern applications at scale:

- **Automatic scaling** — adds or removes containers as needed  
- **Self-healing** — restarts failed containers automatically  
- **Rolling updates without downtime** — safe incremental deployments  
- **Portability / cloud-agnostic** — runs on AWS, Azure, GCP, and on-prem  
- **Infrastructure abstraction** — you describe what you want; Kubernetes maintains it  

It takes the complexity out of manually managing containers across multiple servers.

---

## How Does Kubernetes Compare to AWS ECS?

AWS ECS (Elastic Container Service) is Amazon’s container orchestration platform. While powerful and simpler to use, it is more limited than Kubernetes.

### Control Plane & Vendor Lock-In

| Feature | Kubernetes | AWS ECS |
|--------|------------|---------|
| **Control plane** | You manage it (unless using EKS) | Fully managed by AWS |
| **Vendor lock-in** |  No (open standard) |  Yes (AWS-only) |

### Capabilities Comparison

| Topic | Kubernetes | ECS |
|-------|------------|------|
| **Multi-cloud** |  Yes |  No |
| **On-prem support** |  Yes |  No |
| **Auto-scaling** | Built-in and powerful | Depends on AWS integrations |
| **Networking** | Complex but very powerful | Simpler, more limited |

**Summary:**  
ECS is easier and integrates tightly with AWS, but Kubernetes is **far more flexible, portable, and feature-rich**.

---

## Strengths and Weaknesses of Kubernetes

### Strengths
- Extremely flexible  
- Large ecosystem (Helm, Istio, ArgoCD, etc.)  
- Proven reliability and high availability  
- Industry-wide standard  
- Works on-prem and in any cloud  

### Weaknesses
- Steep learning curve  
- Can be overkill for small projects  
- Debugging cluster issues can be difficult  
- Requires many components (networking, ingress, monitoring)

---

## Basic Kubernetes Example

The following configuration creates a simple web server deployment.

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: nginx
        ports:
        - containerPort: 80
```
### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```
## What This Setup Does
- Runs 3 replicas of an NGINX container  
- Provides stable networking using a Service  
- Exposes the app through a load balancer
- Automatically restarts failed containers  
- Supports rolling updates for zero downtime  

---

### References

Information used in this report comes from the follwing websites:

1. **Kubernetes Documentation – What is Kubernetes?**  
   https://kubernetes.io/docs/concepts/overview/

2. **CNCF (Cloud Native Computing Foundation) – Kubernetes Overview**  
   https://www.cncf.io/projects/kubernetes/

3. **AWS ECS Documentation – Amazon Elastic Container Service**  
   https://docs.aws.amazon.com/AmazonECS/latest/developerguide/

4. **Kubernetes Networking Model – Official Docs**  
   https://kubernetes.io/docs/concepts/cluster-administration/networking/

5. **Red Hat – Kubernetes vs. ECS Comparison**  
   https://www.redhat.com/en/topics/containers/kubernetes-vs-docker-and-ecs
