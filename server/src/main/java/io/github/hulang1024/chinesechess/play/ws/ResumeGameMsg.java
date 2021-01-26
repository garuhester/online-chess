package io.github.hulang1024.chinesechess.play.ws;

import io.github.hulang1024.chinesechess.ws.ClientMessage;
import io.github.hulang1024.chinesechess.ws.ClientMsgType;
import lombok.Data;


@Data
@ClientMsgType("play.resume_game")
public class ResumeGameMsg extends ClientMessage {
}