# BOLET çalışan sipariş portalı

Bu klasör, müşteri sitesinden ayrı yayımlanabilen Vercel projesidir. Ana sayfa / ve /siparisler.html çalışan giriş ekranını açar. Portal, siparişleri Neon veritabanından okur ve mutfak durumlarını günceller.

## Vercel'e yayımlama

1. Bu klasörün içeriğini ayrı bir GitHub deposuna yükleyip Vercel'de o depoyu içe aktarın. Vercel proje kökü bu klasör olmalı.
2. Vercel Environment Variables alanına aşağıdakileri ekleyin:
   - DATABASE_URL: müşteri sitesinin kullandığı aynı Neon veritabanı bağlantısı
   - DATABASE_SCHEMA_READY: true
   - STAFF_DASHBOARD_TOKEN: çalışan erişim anahtarı
   - SITE_ORIGIN: bu çalışan portalının tam origin'i; örneğin https://bolet-personel.vercel.app (sonunda / olmadan)
3. Veritabanında db/001_orders.sql ve db/002_staff_workflow.sql şemalarını bir kez uygulayın. Zaten uygulanmışlarsa tekrar çalıştırmak güvenlidir.
4. Deploy tamamlanınca https://<portal-adresi>.vercel.app/ veya /siparisler.html adresini açın.

Müşteri sitesi ve çalışan portalı aynı DATABASE_URL değerini kullanmalıdır. Müşteri sipariş API'sinin SITE_ORIGIN değeri müşteri sitesi origin'i olarak kalır; çalışan projesinde ayrı olarak çalışan portalının origin'i kullanılır.

Bu proje gerçek siparişleri kendiliğinden açmaz. Sipariş kaydı için müşteri sitesindeki sipariş ayarları da etkin olmalıdır. API erişim kodu hiçbir HTML dosyasına konmaz.