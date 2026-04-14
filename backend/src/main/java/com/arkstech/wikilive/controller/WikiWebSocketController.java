package com.arkstech.wikilive.controller;

import com.arkstech.wikilive.dto.WsMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WikiWebSocketController {



    @MessageMapping("/page.update")
    @SendTo("/topic/pages")
    public WsMessage broadcastPageUpdate(WsMessage message) {
        return message;
    }

    @MessageMapping("/presence")
    @SendTo("/topic/presence")
    public WsMessage broadcastPresence(WsMessage message) {
        return message;
    }
}
