const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');

// Caminho para o arquivo .proto
const PROTO_PATH = './users.proto';

// Carregamento dos usuários a partir do arquivo JSON
const users = JSON.parse(fs.readFileSync('users.json'));

// Carrega a definição do serviço a partir do arquivo .proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

// Carrega o pacote de usuários
const userProto = grpc.loadPackageDefinition(packageDefinition).users;

// Criação do servidor gRPC
const server = new grpc.Server();

// Implementação do serviço UserService
server.addService(userProto.UserService.service, {
    // Implementação do método GetAllUsers
    GetAllUsers: (_, callback) => {
        callback(null, { users });
    },

    // Implementação do método GetUserById
    GetUserById: (call, callback) => {
        const user = users.find((u) => u.id === call.request.id);
        if (user) {
            callback(null, user);
        } else {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "User not found",
            });
        }
    },
});

// Inicializa o servidor na porta 50051
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Servidor rodando na porta ${port}`);
    server.start();
});
