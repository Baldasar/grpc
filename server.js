const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");

// Caminho para o arquivo .proto
const PROTO_PATH = "./users.proto";

// Carregamento dos usuários a partir do arquivo JSON
let users = JSON.parse(fs.readFileSync("users.json"));
let services = [];  // Lista de serviços

// Carrega a definição do serviço a partir do arquivo .proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Carrega o pacote de usuários e serviços
const userProto = grpc.loadPackageDefinition(packageDefinition).users;

// Função para salvar os usuários no arquivo JSON
function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

// Função para salvar os serviços no arquivo JSON
function saveServices() {
  fs.writeFileSync("services.json", JSON.stringify(services, null, 2));
}

// Criação do servidor gRPC
const server = new grpc.Server();

// Implementação do serviço UserService
server.addService(userProto.UserService.service, {
  GetAllUsers: (_, callback) => {
    callback(null, { users });
  },

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

  CreateUser: (call, callback) => {
    const newUser = {
      id: users.length > 0 ? users[users.length - 1].id + 1 : 1,
      name: call.request.name,
      email: call.request.email,
      cpf: call.request.cpf,
    };
    users.push(newUser);
    saveUsers();
    callback(null, {
      message: "User created successfully",
      user: newUser,
    });
  },
});

// Implementação do serviço ServiceService
server.addService(userProto.ServiceService.service, {
  // Implementação do método CreateService
  CreateService: (call, callback) => {
    const newService = {
      id: services.length > 0 ? services[services.length - 1].id + 1 : 1,
      userId: call.request.userId,
      startDate: call.request.startDate,
      endDate: call.request.endDate,
      price: call.request.price,
      serviceType: call.request.serviceType,
    };
    services.push(newService);
    saveServices();
    callback(null, {
      message: "Service created successfully",
      service: newService,
    });
  },

  // Implementação do método GetAllServices
  GetAllServices: (_, callback) => {
    callback(null, { services });
  },

  // Implementação do método GetServiceById
  GetServiceById: (call, callback) => {
    const service = services.find((s) => s.id === call.request.id);
    if (service) {
      callback(null, service);
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Service not found",
      });
    }
  },
});

// Inicializa o servidor na porta 50051
server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Servidor rodando na porta ${port}`);
    server.start();
  }
);
