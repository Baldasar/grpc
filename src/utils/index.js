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

// Função para formatar o CPF no formato xxx.xxx.xxx-xx
function formatarCpf(cpf) {
  cpf = cpf.replace(/[^\d]+/g, ""); // Remove qualquer coisa que não seja número
  if (cpf.length === 11) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return cpf; // Retorna o CPF sem formatação se não tiver 11 dígitos
}

// Função para gerar IDs de 5 dígitos
function gerarId() {
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return parseInt(result, 10);
}

module.exports = {
  formatarData,
  validarEmail,
  validarData,
  validarCpf,
  validarTipoServico,
  formatarCpf,
  gerarId,
};
