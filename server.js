const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');

// Caminho para o arquivo .proto
const PROTO_PATH = './users.proto';

// Carregamento dos usuários a partir do arquivo JSON
let users = JSON.parse(fs.readFileSync('users.json'));

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

// Função para salvar os usuários no arquivo JSON
function saveUsers() {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

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

    // Implementação do método CreateUser
    CreateUser: (call, callback) => {
        const newUser = {
            id: users.length > 0 ? users[users.length - 1].id + 1 : 1,
            name: call.request.name,
            email: call.request.email,
        };
        users.push(newUser);
        saveUsers();
        
        // Exibe uma mensagem de sucesso e retorna o usuário recém-cadastrado
        callback(null, {
            message: "Usuário cadastrado com sucesso",
            user: newUser,
        });
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
