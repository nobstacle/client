function ResponseBulkUpload(data:any) {
   
  }
  
  function DownloadSampleResponseFile(fields:any) {
    const headers = fields.map((field:any) => field.text);

    const csvContent = [
        headers.join(","),
        ...fields.map((field:any) => {
            return headers.map((header:any) => "").join(",");
        })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "response_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



  
  export { ResponseBulkUpload, DownloadSampleResponseFile };
  