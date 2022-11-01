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
        container('docker') {
          withKubeConfig([credentialsId: 'kubeconfig', serverUrl: 'https://45.9.75.226']) {
             sh """
                docker run --rm --name kubectl bitnami/kubectl:latest set image -n easyview deployment/easyview nixite/easyview=nixite/easyview:latest
                """
          }
        }
      }
    }
  }
}