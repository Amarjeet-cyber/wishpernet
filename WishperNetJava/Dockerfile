# Multi-stage Dockerfile: build with Maven, run with OpenJDK
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080 3000
ENTRYPOINT ["java","-jar","/app/app.jar"]
