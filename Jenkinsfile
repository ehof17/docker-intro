pipeline{
    agent any

    stages {
        stage('hello') {
            steps {
                echo 'Hello World'
            }
        }
        stage('installing dependencies') {
            agent{
                docker {
                    image 'node:18-alpine'
                }
            }
            steps {
                sh 'npm i'
            }
        }

    }
}