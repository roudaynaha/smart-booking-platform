$services = @(
    "api-gateway",
    "services/user-service",
    "services/catalog-service",
    "services/booking-service",
    "services/payment-service",
    "services/notification-service"
)

foreach ($service in $services) {
    Set-Location "c:\Users\Dell\Desktop\soa-micro\smart-booking-platform\$service"
    npm init -y
    
    if ($service -eq "api-gateway") {
        npm install express apollo-server-express @grpc/grpc-js @grpc/proto-loader graphql body-parser cors
    } elseif ($service -eq "services/user-service" -or $service -eq "services/catalog-service" -or $service -eq "services/booking-service") {
        npm install @grpc/grpc-js @grpc/proto-loader kafkajs sqlite3
    } else {
        npm install @grpc/grpc-js @grpc/proto-loader kafkajs rxdb rxjs
    }
}
