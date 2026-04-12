package com.arkstech.wikilive.dto;

import lombok.Data;


//объект для ПЕРЕДАЧИ данных между фронтом и бэкендом

@Data
public class PageRequest {
    private String title;
    private String content;     //JSON
    private String mwsTableId;  //таблица из МТС
}
