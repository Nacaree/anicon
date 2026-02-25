FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Declare build args so Railway's "Available during build" vars reach Maven
ARG SUPABASE_DB_URL
ARG SUPABASE_DB_USERNAME
ARG SUPABASE_DB_PASSWORD
ENV SUPABASE_DB_URL=$SUPABASE_DB_URL
ENV SUPABASE_DB_USERNAME=$SUPABASE_DB_USERNAME
ENV SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD

COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/anicon-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xms256m", "-Xmx768m", "-jar", "app.jar"]
