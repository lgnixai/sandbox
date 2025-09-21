package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type Product struct {
	ID             string    `json:"id"`
	Created        time.Time `json:"created"`
	Updated        time.Time `json:"updated"`
	Name           string    `json:"name"`
	Model          string    `json:"model"`
	Category       string    `json:"category"`
	Description    string    `json:"description"`
	Specifications string    `json:"specifications"`
	Voltage        string    `json:"voltage"`
	Capacity       string    `json:"capacity"`
	Current        string    `json:"current"`
	Images         string    `json:"images"`
	Documents      string    `json:"documents"`
	Videos         string    `json:"videos"`
	Price          string    `json:"price"`
	Status         string    `json:"status"`
}

type Category struct {
	ID          string    `json:"id"`
	Created     time.Time `json:"created"`
	Updated     time.Time `json:"updated"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Image       string    `json:"image"`
}

var products []Product
var categories []Category

func main() {
	// 初始化数据
	initData()

	// 设置路由
	r := mux.NewRouter()

	// API路由
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/collections/products/records", getProducts).Methods("GET")
	api.HandleFunc("/collections/categories/records", getCategories).Methods("GET")
	api.HandleFunc("/import", importProducts).Methods("POST")

	// 产品详情页面路由
	r.HandleFunc("/product/{id}", serveProductDetail).Methods("GET")

	// 独立页面路由
	r.HandleFunc("/products", serveProducts).Methods("GET")
	r.HandleFunc("/about", serveAbout).Methods("GET")
	r.HandleFunc("/contact", serveContact).Methods("GET")
	r.HandleFunc("/blog", serveBlog).Methods("GET")

	// SEO相关路由
	r.HandleFunc("/sitemap.xml", generateSitemap).Methods("GET")
	r.HandleFunc("/robots.txt", serveRobots).Methods("GET")

	// 静态文件服务 - CSS文件
	r.HandleFunc("/css/tailwind.css", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		http.ServeFile(w, r, "./public/css/tailwind.css")
	}).Methods("GET")

	// 静态文件服务 - JavaScript文件（优先处理）
	r.HandleFunc("/js/lucide.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		http.ServeFile(w, r, "./public/js/lucide.js")
	}).Methods("GET")

	r.HandleFunc("/product-detail.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, "./public/product-detail.js")
	}).Methods("GET")

	r.HandleFunc("/app.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		http.ServeFile(w, r, "./public/app.js")
	}).Methods("GET")

	r.HandleFunc("/blog.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		http.ServeFile(w, r, "./public/blog.js")
	}).Methods("GET")

	// 静态文件服务 - 产品图片
	r.PathPrefix("/images/").Handler(http.StripPrefix("/images/", http.FileServer(http.Dir("./"))))

	// 静态文件服务 - 前端资源
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./public/")))

	// 启动服务器
	fmt.Println("服务器启动在 http://localhost:8090")
	fmt.Println("产品展示网站: http://localhost:8090")
	fmt.Println("API文档: http://localhost:8090/api/collections/products/records")

	log.Fatal(http.ListenAndServe(":8090", r))
}

func initData() {
	// 初始化分类
	categories = []Category{
		{
			ID:          "super_capacitors",
			Created:     time.Now(),
			Updated:     time.Now(),
			Name:        "超级电容器",
			Description: "各种电压和容量的超级电容器产品",
		},
		{
			ID:          "connectors",
			Created:     time.Now(),
			Updated:     time.Now(),
			Name:        "连接器",
			Description: "各种电流规格的连接器产品",
		},
		{
			ID:          "cables",
			Created:     time.Now(),
			Updated:     time.Now(),
			Name:        "连接线",
			Description: "卡车电池连接线等线缆产品",
		},
	}

	// 导入产品数据
	importProductsFromFiles()
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]interface{}{
		"page":       1,
		"perPage":    500,
		"totalItems": len(products),
		"totalPages": 1,
		"items":      products,
	}

	json.NewEncoder(w).Encode(response)
}

func getCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]interface{}{
		"page":       1,
		"perPage":    500,
		"totalItems": len(categories),
		"totalPages": 1,
		"items":      categories,
	}

	json.NewEncoder(w).Encode(response)
}

func importProducts(w http.ResponseWriter, r *http.Request) {
	importProductsFromFiles()

	response := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("成功导入 %d 个产品", len(products)),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func serveProductDetail(w http.ResponseWriter, r *http.Request) {
	// 直接返回产品详情页面HTML
	http.ServeFile(w, r, "./public/product.html")
}

func serveProducts(w http.ResponseWriter, r *http.Request) {
	// 返回产品列表页面HTML
	http.ServeFile(w, r, "./public/products.html")
}

func serveAbout(w http.ResponseWriter, r *http.Request) {
	// 返回关于我们页面HTML
	http.ServeFile(w, r, "./public/about.html")
}

func serveContact(w http.ResponseWriter, r *http.Request) {
	// 返回联系我们页面HTML
	http.ServeFile(w, r, "./public/contact.html")
}

func serveBlog(w http.ResponseWriter, r *http.Request) {
	// 返回博客页面HTML
	http.ServeFile(w, r, "./public/blog.html")
}

func generateSitemap(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/xml")

	sitemap := `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>http://localhost:8090/</loc>
        <lastmod>2024-09-16</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>http://localhost:8090/products</loc>
        <lastmod>2024-09-16</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>http://localhost:8090/about</loc>
        <lastmod>2024-09-16</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>http://localhost:8090/contact</loc>
        <lastmod>2024-09-16</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>http://localhost:8090/blog</loc>
        <lastmod>2024-09-16</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`

	// 添加产品页面
	for _, product := range products {
		sitemap += fmt.Sprintf(`
    <url>
        <loc>http://localhost:8090/product/%s</loc>
        <lastmod>2024-09-16</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`, product.ID)
	}

	sitemap += `
</urlset>`

	w.Write([]byte(sitemap))
}

func serveRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	robots := `User-agent: *
Allow: /

# Sitemap
Sitemap: http://localhost:8090/sitemap.xml

# 允许搜索引擎抓取所有页面
Allow: /product/
Allow: /images/
Allow: /api/

# 禁止抓取管理页面（如果有的话）
Disallow: /admin/
Disallow: /_/`

	w.Write([]byte(robots))
}

func importProductsFromFiles() {
	products = []Product{}

	// 导入超级电容器产品
	importSuperCapacitors()

	// 导入连接器产品
	importConnectors()

	// 导入连接线产品
	importCables()

	fmt.Printf("总共导入了 %d 个产品\n", len(products))
}

func importSuperCapacitors() {
	basePath := "独立站上架产品详情"

	filepath.WalkDir(basePath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // 忽略错误
		}

		if !d.IsDir() || path == basePath {
			return nil
		}

		productName := d.Name()
		voltage, capacity := parseSuperCapacitorSpec(productName)
		images := collectImages(path)

		product := Product{
			ID:             generateID(),
			Created:        time.Now(),
			Updated:        time.Now(),
			Name:           productName,
			Model:          productName,
			Category:       "super_capacitors",
			Description:    fmt.Sprintf("超级电容器产品，电压: %s，容量: %s", voltage, capacity),
			Specifications: fmt.Sprintf("电压: %s, 容量: %s", voltage, capacity),
			Voltage:        voltage,
			Capacity:       capacity,
			Images:         strings.Join(images, ","),
			Status:         "active",
		}

		products = append(products, product)
		return nil
	})
}

func importConnectors() {
	basePath := "钜恒产品英文网站资料"
	connectorProducts := []string{"50A", "100A", "150A", "200ACW", "200ADW", "300A", "启动1"}

	for _, productName := range connectorProducts {
		productPath := filepath.Join(basePath, productName)

		if _, err := os.Stat(productPath); os.IsNotExist(err) {
			continue
		}

		current := parseConnectorCurrent(productName)
		images := collectImages(filepath.Join(productPath, "无背景图"))
		applicationImages := collectImages(filepath.Join(productPath, "应用图"))
		dataImages := collectImages(filepath.Join(productPath, "数据图"))
		documents := collectDocuments(productPath)
		videos := collectVideos(filepath.Join(productPath, "视频"))

		allImages := append(images, applicationImages...)
		allImages = append(allImages, dataImages...)

		product := Product{
			ID:             generateID(),
			Created:        time.Now(),
			Updated:        time.Now(),
			Name:           productName + " 连接器",
			Model:          productName,
			Category:       "connectors",
			Description:    fmt.Sprintf("连接器产品，电流规格: %s", current),
			Specifications: fmt.Sprintf("电流: %s", current),
			Current:        current,
			Images:         strings.Join(allImages, ","),
			Documents:      strings.Join(documents, ","),
			Videos:         strings.Join(videos, ","),
			Status:         "active",
		}

		products = append(products, product)
	}
}

func importCables() {
	basePath := "钜恒产品英文网站资料/卡车电池连接线"

	if _, err := os.Stat(basePath); os.IsNotExist(err) {
		return
	}

	images := collectImages(basePath)
	images = append(images, collectImages(filepath.Join(basePath, "750像素"))...)
	images = append(images, collectImages(filepath.Join(basePath, "尺寸图"))...)
	images = append(images, collectImages(filepath.Join(basePath, "铜排750网图"))...)

	documents := collectDocuments(basePath)

	product := Product{
		ID:             generateID(),
		Created:        time.Now(),
		Updated:        time.Now(),
		Name:           "卡车电池连接线",
		Model:          "Truck Battery Cables",
		Category:       "cables",
		Description:    "卡车电池连接线产品，包括2P、3P、4P等多种规格",
		Specifications: "多种规格的卡车电池连接线",
		Images:         strings.Join(images, ","),
		Documents:      strings.Join(documents, ","),
		Status:         "active",
	}

	products = append(products, product)
}

func parseSuperCapacitorSpec(name string) (voltage, capacity string) {
	parts := strings.Fields(name)
	if len(parts) >= 2 {
		voltage = parts[0]
		capacity = parts[1]
	}
	return
}

func parseConnectorCurrent(name string) string {
	if strings.Contains(name, "A") {
		return name
	}
	return name
}

func collectImages(dirPath string) []string {
	var images []string

	filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		if !d.IsDir() {
			ext := strings.ToLower(filepath.Ext(path))
			if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" {
				images = append(images, path)
			}
		}
		return nil
	})

	return images
}

func collectDocuments(dirPath string) []string {
	var documents []string

	filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		if !d.IsDir() {
			ext := strings.ToLower(filepath.Ext(path))
			if ext == ".doc" || ext == ".docx" || ext == ".pdf" {
				documents = append(documents, path)
			}
		}
		return nil
	})

	return documents
}

func collectVideos(dirPath string) []string {
	var videos []string

	filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		if !d.IsDir() {
			ext := strings.ToLower(filepath.Ext(path))
			if ext == ".mp4" || ext == ".avi" || ext == ".mov" {
				videos = append(videos, path)
			}
		}
		return nil
	})

	return videos
}

func generateID() string {
	return fmt.Sprintf("product_%d", time.Now().UnixNano())
}
