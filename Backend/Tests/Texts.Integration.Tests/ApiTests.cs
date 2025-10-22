using System.Linq;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _c;
    public ApiTests(WebApplicationFactory<Program> f) => _c = f.CreateClient();

    [Fact]
    public async Task Analyze_Returns200_AndPayload_WordCounting()
    {
        var r = await _c.PostAsJsonAsync("/text/analyze", new { text = "aa bb aa" });
        r.EnsureSuccessStatusCode();

        var dto = await r.Content.ReadFromJsonAsync<ResponseDto>();
        Assert.NotNull(dto);

        Assert.Equal(3, dto!.Total);
        Assert.True(dto.Counts.ContainsKey("aa"));
        Assert.True(dto.Counts.ContainsKey("bb"));
        Assert.Equal(2, dto.Counts["aa"]);
        Assert.Equal(1, dto.Counts["bb"]);

        var sum = dto.Frequencies.Values.Sum();
        Assert.InRange(sum, 0.999, 1.001);
    }

    [Fact]
    public async Task Analyze_Empty_Returns400()
    {
        var r = await _c.PostAsJsonAsync("/text/analyze", new { text = "" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task Health_Ok()
    {
        var r = await _c.GetAsync("/health");
        r.EnsureSuccessStatusCode();
    }

    private sealed class ResponseDto
    {
        public int Total { get; set; }
        public Dictionary<string,int> Counts { get; set; } = new();
        public Dictionary<string,double> Frequencies { get; set; } = new();
    }
    
    [Fact]
    public async Task FileAnalyze_TooLarge_Returns413()
    {
        using var content = new MultipartFormDataContent();
        var big = new byte[10 * 1024 * 1024 + 1];
        content.Add(new ByteArrayContent(big), "file", "big.txt");

        var r = await _c.PostAsync("/file/analyze", content);
        Assert.Equal((HttpStatusCode)413, r.StatusCode);
    }
    
    [Fact]
    public async Task FileAnalyze_BadExtension_Returns400()
    {
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("hello")), "file", "data.bin");

        var r = await _c.PostAsync("/file/analyze", content);
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }
    
    [Fact]
    public async Task FileAnalyze_Ok_Returns200_AndPayload()
    {
        using var form = new MultipartFormDataContent();
        var bytes = System.Text.Encoding.UTF8.GetBytes("a b a");
        form.Add(new ByteArrayContent(bytes), "file", "note.txt");

        var r = await _c.PostAsync("/file/analyze", form);
        r.EnsureSuccessStatusCode();

        var dto = await r.Content.ReadFromJsonAsync<ResponseDto>();
        Assert.NotNull(dto);
        Assert.Equal(3, dto!.Total);
        Assert.Equal(2, dto.Counts["a"]);
        Assert.Equal(1, dto.Counts["b"]);
    }
    
    [Fact]
    public async Task FileAnalyze_WrongContentType_Returns400()
    {
        var bytes = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("hello"));
        var r = await _c.PostAsync("/file/analyze", bytes);
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

}
