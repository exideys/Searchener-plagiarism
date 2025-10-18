using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;


public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _c;
    public ApiTests(WebApplicationFactory<Program> f) => _c = f.CreateClient();

    [Fact]
    public async Task Analyze_Returns200_AndPayload()
    {
        var r = await _c.PostAsJsonAsync("/text/analyze", new { text = "hello" });
        r.EnsureSuccessStatusCode();
        var dto = await r.Content.ReadFromJsonAsync<ResponseDto>();
        Assert.NotNull(dto);
        Assert.True(dto!.Total >= 1);
        Assert.True(dto.Counts.ContainsKey("h"));
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
}