const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");

const tiposDeServico = {
  1: "Manutenção",
  2: "Instalação",
  3: "Reparo",
  4: "Limpeza",
  5: "Outros",
};

// Caminho para o arquivo .proto
const PROTO_PATH = "./servico_manutencao.proto";

// Carregamento dos usuários a partir do arquivo JSON
let usuarios = JSON.parse(fs.readFileSync("usuarios.json"));

// Carregamento dos serviços a partir do arquivo JSON
let servicos = JSON.parse(fs.readFileSync("servicos.json"));

// Função para formatar as datas no formato brasileiro (dd/mm/yyyy)
function formatarData(data) {
  const partes = data.split("/");
  if (partes.length === 3) {
    const dia = partes[0];
    const mes = partes[1];
    const ano = partes[2];
    return `${dia}/${mes}/${ano}`; // Formato dd/mm/yyyy
  }
  return null; // Retorna null caso o formato seja inválido
}

// Função para validar o formato do e-mail
function validarEmail(email) {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
}

// Função para validar o formato da data
function validarData(data) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/; // Regex para verificar o formato dd/mm/yyyy
  return regex.test(data);
}

// Função para validar o CPF (somente números)
function validarCpf(cpf) {
  // Remover caracteres não numéricos (caso haja alguma formatação)
  cpf = cpf.replace(/[^\d]+/g, "");

  // Verificar se o CPF possui 11 dígitos
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false; // CPF com números repetidos como 11111111111 não é válido
  }

  // Validar primeiro dígito verificador
  let soma = 0;
  let resto;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) {
    return false;
  }

  // Validar segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) {
    return false;
  }

  return true;
}

// Função para verificar se o tipo de serviço é válido
function validarTipoServico(tipo) {
  return tipo >= 1 && tipo <= 5;
}

// Carrega a definição do serviço a partir do arquivo .proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Carrega o pacote de usuários e serviços
const usuarioProto = grpc.loadPackageDefinition(packageDefinition).usuarios;

// Função para salvar os usuários no arquivo JSON
function salvarUsuarios() {
  fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));
}

// Função para salvar os serviços no arquivo JSON
function salvarServicos() {
  fs.writeFileSync("servicos.json", JSON.stringify(servicos, null, 2));
}

// Função para gerar IDs de 5 dígitos
function gerarId() {
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return parseInt(result, 10);
}

// Criação do servidor gRPC
const server = new grpc.Server();

// Implementação do serviço UsuarioService
server.addService(usuarioProto.UsuarioService.service, {
  GetAllUsuarios: (_, callback) => {
    callback(null, { usuarios });
  },

  GetUsuarioById: (call, callback) => {
    const usuario = usuarios.find((u) => u.id === call.request.id);
    if (usuario) {
      callback(null, usuario);
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
      usuario: novoUsuario,
    });
  },
});

// Implementação do serviço ServicoService
server.addService(usuarioProto.ServicoService.service, {
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

    const novoServico = {
      id: gerarId(),
      usuarioId: call.request.usuarioId,
      dataInicio: formatarData(call.request.dataInicio), // Formata a data de início
      dataFim: formatarData(call.request.dataFim), // Formata a data de fim
      preco: call.request.preco,
      tipoServico: call.request.tipoServico,
    };
    servicos.push(novoServico);
    salvarServicos();
    callback(null, {
      message: "Serviço criado com sucesso",
      servico: novoServico,
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
        dataInicio: formatarData(servico.dataInicio), // Formata dataInicio
        dataFim: formatarData(servico.dataFim), // Formata dataFim
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
        dataInicio: formatarData(servico.dataInicio),
        dataFim: formatarData(servico.dataFim),
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
