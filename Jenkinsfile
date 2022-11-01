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
  - name: curl
    image: curlimages/curl:latest
    command:
    - cat
    tty: true
  - name: docker
    image: docker:latest
    command:
    - cat
      containers:
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
             docker build -t nixite/easyview .
             """
        }
      }
    }
//    stage('Test') {
//      steps {
//        container('docker') {
//          sh """
//             docker-compose run web python manage.py test;
//             """
//        }
//      }
//    }
    stage('Push') {
      steps {
        container('docker') {
          withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
             sh """
                docker login -u $USERNAME -p $PASSWORD;
                docker push nixite/easyview
                """
          }
        }
      }
    }
    stage('Deploy') {
      steps {
        container('curl') {
          withKubeConfig([credentialsId: 'kubeconfig', serverUrl: 'https://45.9.75.226']) {
             sh 'curl -LO "https://storage.googleapis.com/kubernetes-release/release/v1.25.3/bin/linux/amd64/kubectl"'
             sh 'chmod u+x ./kubectl'
             sh './kubectl set image -n easyview deployment/easyview nixite/easyview=nixite/easyview:latest'
          }
        }
      }
    }
  }
}