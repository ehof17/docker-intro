pipeline{
    agent any

    stages {
        stage('hello') {
            steps {
                echo 'Hello World'
            }
        }
        stage('Build Docker image') {
            steps {
                sh 'docker build -t nba-lookers:${GIT_COMMIT} .'
            }
        }

    }
}