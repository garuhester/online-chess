package io.github.hulang1024.chinesechess.room.ws;

import io.github.hulang1024.chinesechess.ws.message.ClientMessage;
import io.github.hulang1024.chinesechess.ws.message.ClientMsgType;
import lombok.Data;

@Data
@ClientMsgType("lobby.enter")
public class LobbyEnterMsg extends ClientMessage {

}
