# Stage 1: Build JAR package
FROM maven:3.8.4-openjdk-17 AS builder
WORKDIR /usr/src/app
COPY pom.xml .
# Fetch dependencies to cache layers
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Expose and Run
FROM openjdk:17-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
