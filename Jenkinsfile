pipeline {
  agent {
    kubernetes {
      label 'easyview'
      defaultContainer 'jnlp'
      yaml """
apiVersion: v1
kind: Pod
metadata:
labels:
  component: ci
spec:
  containers:
  - name: docker
    image: docker:latest
    command:
    - cat
    tty: true
    volumeMounts:
    - mountPath: /var/run/docker.sock
      name: docker-sock
  volumes:
    - name: docker-sock
      hostPath:
        path: /var/run/docker.sock
      """
}
   }
  stages {
    stage('Build') {
      steps {
        container('docker') {
          sh """
             docker build -t nixite/easyview:$BUILD_NUMBER .
             """
        }
      }
    }
  }
}