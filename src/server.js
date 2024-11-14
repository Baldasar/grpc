const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");

// Importa as funções utilitárias
const {
  validarEmail,
  validarData,
  validarCpf,
  validarTipoServico,
  formatarCpf,
  gerarId,
} = require("./utils");

// Importa os tipos
const { tiposDeServico, status } = require("./types");

// Caminho para o arquivo .proto
const PROTO_PATH = `${__dirname}/servico_manutencao.proto`;

// Carregamento dos usuários a partir do arquivo JSON
const usuarios = JSON.parse(fs.readFileSync(`${__dirname}/data/usuarios.json`));

// Carregamento dos serviços a partir do arquivo JSON
let servicos = JSON.parse(fs.readFileSync(`${__dirname}/data/servicos.json`));

// Carrega a definição do serviço a partir do arquivo .proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
// Carrega o pacote
const servicoManutencaoProto =
  grpc.loadPackageDefinition(packageDefinition).servico_manutencao;

// Função para salvar os usuários no arquivo JSON
function salvarUsuarios() {
  fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));
}

// Função para salvar os serviços no arquivo JSON
function salvarServicos() {
  fs.writeFileSync("servicos.json", JSON.stringify(servicos, null, 2));
}

// Criação do servidor gRPC
const server = new grpc.Server();

// Implementação do serviço UsuarioService
server.addService(servicoManutencaoProto.UsuarioService.service, {
  // Método para consultar todos os usuários
  GetAllUsuarios: (_, callback) => {
    const usuariosComCpfFormatado = usuarios.map((usuario) => ({
      ...usuario,
      cpf: formatarCpf(usuario.cpf), // Formata o CPF antes de enviar
    }));
    callback(null, { usuarios: usuariosComCpfFormatado });
  },

  // Método para consultar um usuário por ID
  GetUsuarioById: (call, callback) => {
    const usuario = usuarios.find((u) => u.id === call.request.id);
    if (usuario) {
      callback(null, {
        ...usuario,
        cpf: formatarCpf(usuario.cpf), // Formata o CPF antes de enviar
      });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Usuário não encontrado",
      });
    }
  },

  CreateUsuario: (call, callback) => {
    // Validação do e-mail
    if (!validarEmail(call.request.email)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details:
          "Formato de e-mail inválido. O e-mail deve seguir o formato correto (exemplo@dominio.com).",
      });
    }

    // Validação do CPF (somente números)
    if (!validarCpf(call.request.cpf)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details:
          "CPF inválido. O CPF deve ser válido e conter apenas números (xxx.xxx.xxx-xx).",
      });
    }

    // Validar se o CPF já está cadastrado
    const cpfExistente = usuarios.find((u) => u.cpf === call.request.cpf);
    if (cpfExistente) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        details: "CPF já cadastrado",
      });
    }

    const novoUsuario = {
      id: gerarId(),
      nome: call.request.nome,
      email: call.request.email,
      cpf: call.request.cpf,
    };
    usuarios.push(novoUsuario);
    salvarUsuarios();
    callback(null, {
      message: "Usuário criado com sucesso",
      usuario: {
        ...novoUsuario,
        cpf: formatarCpf(novoUsuario.cpf),
      },
    });
  },
});

// Implementação do serviço ServicoService
server.addService(servicoManutencaoProto.ServicoService.service, {
  // Implementação do método CreateServico
  CreateServico: (call, callback) => {
    // Validação do usuário
    const usuarioExistente = usuarios.find(
      (u) => u.id === call.request.usuarioId
    );
    if (!usuarioExistente) {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: "Usuário com o ID informado não encontrado",
      });
    }

    // Validação do tipo de serviço
    if (!validarTipoServico(call.request.tipoServico)) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: "Tipo de serviço inválido. Deve ser um número entre 1 e 5.",
      });
    }

    // Validação e formatação das datas
    if (
      !validarData(call.request.dataInicio) ||
      !validarData(call.request.dataFim)
    ) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: "Formato de data inválido. Utilize o formato dd/mm/yyyy.",
      });
    }

    // Validar se a data de início é anterior à data de fim
    const dataInicio = new Date(call.request.dataInicio);
    const dataFim = new Date(call.request.dataFim);
    if (dataInicio >= dataFim) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: "A data de início deve ser anterior à data de fim.",
      });
    }

    const novoServico = {
      id: gerarId(),
      usuarioId: call.request.usuarioId,
      dataInicio: call.request.dataInicio,
      dataFim: call.request.dataFim,
      preco: call.request.preco,
      tipoServico: call.request.tipoServico,
      status: 1,
    };
    servicos.push(novoServico);
    salvarServicos();
    callback(null, {
      message: "Serviço criado com sucesso",
      servico: {
        ...novoServico,
        nomeUsuario: usuarioExistente.nome,
        tipoServico:
          tiposDeServico[novoServico.tipoServico] ||
          "Tipo de serviço desconhecido",
        dataInicio: novoServico.dataInicio,
        dataFim: novoServico.dataFim,
        status: status[novoServico.status] || "Status desconhecido",
      },
    });
  },

  // Implementação do método GetAllServicos
  GetAllServicos: (_, callback) => {
    const servicosComDetalhes = servicos.map((servico) => {
      const usuario = usuarios.find((u) => u.id === servico.usuarioId);
      return {
        ...servico,
        nomeUsuario: usuario ? usuario.nome : "Usuário não encontrado",
        tipoServico:
          tiposDeServico[servico.tipoServico] || "Tipo de serviço desconhecido",
        dataInicio: servico.dataInicio,
        dataFim: servico.dataFim,
        status: status[servico.status] || "Status desconhecido",
      };
    });
    callback(null, { servicos: servicosComDetalhes });
  },

  // Implementação do método GetServicoById
  GetServicoById: (call, callback) => {
    const servico = servicos.find((s) => s.id === call.request.id);
    if (servico) {
      const usuario = usuarios.find((u) => u.id === servico.usuarioId);
      const servicoComDetalhes = {
        ...servico,
        nomeUsuario: usuario ? usuario.nome : "Usuário não encontrado",
        tipoServico:
          tiposDeServico[servico.tipoServico] || "Tipo de serviço desconhecido",
        dataInicio: servico.dataInicio,
        dataFim: servico.dataFim,
        status: status[servico.status] || "Status desconhecido",
      };
      callback(null, servicoComDetalhes);
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Serviço não encontrado",
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
