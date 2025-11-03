pipeline{
    agent any

    stages {
        stage('hello') {
            steps {
                echo 'Hello World'
            }
        }
        stage('installing dependencies') {
            steps {
                sh 'npm i'
            }
        }

    }
}