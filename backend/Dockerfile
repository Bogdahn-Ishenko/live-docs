# build jar
FROM maven:3.9.6-eclipse-temurin-21 AS builder

WORKDIR /build

# зависимости
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# исходники и соборка
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# run app
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# копируем готовый jar из builder
COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8085

ENTRYPOINT ["java","-jar","app.jar"]