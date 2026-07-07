FROM golang:1.26-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o koubo-server .

FROM alpine:3.21
RUN apk add --no-cache ffmpeg ca-certificates tzdata curl
WORKDIR /app
COPY --from=builder /app/koubo-server .
RUN mkdir -p uploads
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:8080/health || exit 1
CMD ["./koubo-server"]
