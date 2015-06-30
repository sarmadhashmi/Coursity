package main

import (
	"fmt"
	"html/template"
	"net/http"
	"io/ioutil"	
)

type Parser struct {
	University string
	Body []byte
}

func(p *Parser) save() error {			// saves Parser struct info to file
	filename := p.University + ".txt"
	return ioutil.WriteFile(filename, p.Body, 0600)
}

func loadParser(title string) (*Parser, error) {
	filename := title + ".txt"
	body, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	return &Parser{University: title, Body: body}, nil
}

func renderTemplate(w http.ResponseWriter, tmpl string, p *Parser) {
	t, _ := template.ParseFiles(tmpl + ".html")
	t.Execute(w, p)
}

func parserHandler(w http.ResponseWriter, r *http.Request) {
	university := r.URL.Path[len("/parser/"):]
	p, err := loadParser(university)
	if err != nil {
		p = &Parser{University: university}
	}
	renderTemplate(w, "index", p)
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	file, handler, err := r.FormFile("file") 
    if err != nil { 
    	fmt.Println(err) 
   	} 
   	data, err := ioutil.ReadAll(file) 
   	if err != nil { 
   		fmt.Println(err) 
   	} 
   	err = ioutil.WriteFile("./tmp/" + handler.Filename, data, 0777) 
   	if err != nil { 
   		fmt.Println(err) 
   	} 
}


func main() {
	p1 := &Parser{University: "mcmaster", Body: []byte("Something about mcmaster here")}
	p1.save()
	http.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./js/"))))	
	http.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("./css/"))))	
	http.HandleFunc("/parser/", parserHandler)		
	http.HandleFunc("/upload/",  uploadHandler)
	http.ListenAndServe(":8080", nil)
}