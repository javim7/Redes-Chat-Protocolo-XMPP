const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

class ClienteXMPP {
  constructor(username, password, service = "xmpp://alumchat.xyz:5222", domain = "alumchat.xyz") {
    this.username = username;
    this.password = password;
    this.service = service;
    this.domain = domain;
    this.xmpp = null;
  }

  async conectar() {
    this.xmpp = client({
      service: this.service,
      domain: this.domain,
      username: this.username,
      password: this.password,
    });


    this.xmpp.on("error", (err) => {
      console.error(err);
    });

    this.xmpp.on("online", async () => {
      await this.xmpp.send(xml("presence"));
    });

    await this.xmpp.start().catch(console.error);
  }

  async enviarMensaje(destinatario, mensaje) {
    if (!this.xmpp) {
      throw new Error("El cliente XMPP no está conectado. Primero llama al método 'conectar()'.");
    }

    const message = xml(
      "message",
      { type: "chat", to: destinatario },
      xml("body", {}, mensaje)
    );

    await this.xmpp.send(message);
  }
}

// Ejemplo de uso de la clase ClienteXMPP para enviar un mensaje
async function ejemploEnviarMensaje() {
  const cliente = new ClienteXMPP("mom20067", "varcelona");
  await cliente.conectar();

  const destinatario = "val20159@alumchat.xyz"; // Reemplaza "otroUsuario" con el nombre de usuario del destinatario
  const mensaje = "willy gay"; // Mensaje que deseas enviar
  await cliente.enviarMensaje(destinatario, mensaje);
  console.log("Mensaje enviado correctamente.");
}

ejemploEnviarMensaje().catch((error) => {
  console.error("Error al enviar el mensaje:", error);
});